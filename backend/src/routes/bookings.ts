import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import { notificationService } from '../services/notifications.js';
import dotenv from 'dotenv';
import { userPreferences } from '../services/userPreferences.js';

dotenv.config();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

const router = express.Router();

// Get bookings
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query; // 'user' or 'creator'

    let query = supabase
      .from('bookings')
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(display_name, user_id),
        creator:profiles!bookings_creator_id_fkey(display_name, user_id)
      `)
      .order('created_at', { ascending: false });

    if (type === 'creator') {
      query = query.eq('creator_id', req.userId);
    } else {
      query = query.eq('user_id', req.userId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    // Get user emails from auth
    const userIds = new Set<string>();
    (bookings || []).forEach((b: any) => {
      userIds.add(b.user_id);
      userIds.add(b.creator_id);
    });

    const emails: Record<string, string> = {};
    for (const userId of userIds) {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      if (user?.user?.email) {
        emails[userId] = user.user.email;
      }
    }

    // Transform to match expected format
    const result = (bookings || []).map((b: any) => ({
      ...b,
      user_email: emails[b.user_id] || null,
      user_name: b.user?.display_name || null,
      creator_email: emails[b.creator_id] || null,
      creator_name: b.creator?.display_name || null,
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Create booking
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { creatorId, serviceType, startDate, endDate, totalAmount, notes } = req.body;

    if (!creatorId || !serviceType || !startDate) {
      return res.status(400).json({ error: 'Creator ID, service type, and start date are required' });
    }

    // Import client service
    const { ensureClientExists, isFreelancer } = await import('../services/clientService.js');

    // Auto-create client if creator is a freelancer
    const creatorIsFreelancer = await isFreelancer(creatorId);
    if (creatorIsFreelancer) {
      await ensureClientExists({
        freelancerId: creatorId,
        userId: req.userId,
      });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        user_id: req.userId,
        creator_id: creatorId,
        service_type: serviceType,
        start_date: startDate,
        end_date: endDate || null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify creator about new booking request
    await notificationService.notifyBooking(creatorId, booking.id, 'requested');

    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if user has permission (either user or creator)
    const { data: existing, error: checkError } = await supabase
      .from('bookings')
      .select('user_id, creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existing.user_id !== req.userId && existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify user about booking status change
    if (status === 'confirmed') {
      await notificationService.notifyBooking(booking.user_id, booking.id, 'confirmed');
    } else if (status === 'cancelled') {
      await notificationService.notifyBooking(booking.user_id, booking.id, 'cancelled');
    } else if (status === 'completed') {
      await notificationService.notifyBooking(booking.user_id, booking.id, 'completed');
    }

    res.json(booking);
  } catch (error: any) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

/**
 * Pay for general booking
 */
router.post('/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(display_name, phone)
      `)
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);

    if (!booking.total_amount || booking.total_amount <= 0) {
      return res.status(400).json({ error: 'Booking has no amount to pay' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateServiceBookingFee(parseFloat(booking.total_amount), undefined, currency);

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: id,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'service_booking',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    // Record platform fee
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: id,
        transaction_type: 'service_booking',
        user_id: booking.creator_id,
        buyer_id: req.userId,
        subtotal: feeCalculation.subtotal,
        platform_fee: feeCalculation.platformFee,
        payment_processing_fee: feeCalculation.paymentProcessingFee,
        total_fees: feeCalculation.totalFees,
        creator_payout: feeCalculation.creatorPayout,
        status: 'pending',
      });

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: currency,
      orderId: `service_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || booking.user?.display_name || 'Customer',
      description: `Payment for service booking: ${booking.service_type}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: clickPesaResponse.error || 'Payment creation failed',
        })
        .eq('id', payment.id);

      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await supabase
      .from('payments')
      .update({
        payment_id: clickPesaResponse.paymentId,
        transaction_id: clickPesaResponse.transactionId,
        checkout_url: clickPesaResponse.checkoutUrl,
        status: 'initiated',
      })
      .eq('id', payment.id);

    res.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl: clickPesaResponse.checkoutUrl,
      message: 'Payment initiated successfully',
    });
  } catch (error: any) {
    console.error('Create service booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
