import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';
import { userPreferences } from '../services/userPreferences.js';

dotenv.config();

const router = express.Router();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

/**
 * Get performance bookings for performer
 */
router.get('/my-bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('performance_bookings')
      .select(`
        *,
        client:profiles!performance_bookings_client_id_fkey(display_name)
      `)
      .eq('performer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (bookings || []).map((pb: any) => ({
      ...pb,
      client_name: pb.client?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get performance bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

/**
 * Get performance bookings for client
 */
router.get('/my-requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('performance_bookings')
      .select(`
        *,
        performer:profiles!performance_bookings_performer_id_fkey(display_name)
      `)
      .eq('client_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (bookings || []).map((pb: any) => ({
      ...pb,
      performer_name: pb.performer?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get performance requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

/**
 * Create performance booking request
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { performerId, performanceType, eventName, venue, performanceDate, durationHours, fee, requirements, notes } = req.body;

    if (!performerId || !performanceType || !performanceDate || !fee) {
      return res.status(400).json({ error: 'Performer ID, performance type, date, and fee are required' });
    }

    const { data, error } = await supabase
      .from('performance_bookings')
      .insert({
        performer_id: performerId,
        client_id: req.userId,
        performance_type: performanceType,
        event_name: eventName || null,
        venue: venue || null,
        performance_date: performanceDate,
        duration_hours: durationHours ? parseFloat(durationHours) : null,
        fee: parseFloat(fee),
        requirements: requirements || null,
        notes: notes || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create performance booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * Update performance booking status (performer accepts/rejects)
 */
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Verify performer owns this booking
    const { data: existing, error: checkError } = await supabase
      .from('performance_bookings')
      .select('performer_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existing.performer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('performance_bookings')
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

    res.json(data);
  } catch (error: any) {
    console.error('Update performance booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

/**
 * Pay for performance booking
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
    const currency = userPrefs.currency || 'TZS';

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('performance_bookings')
      .select(`
        *,
        client:users!performance_bookings_client_id_fkey(email),
        client_profile:profiles!performance_bookings_client_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('client_id', req.userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed before payment' });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    // Calculate fees with user's currency (performance bookings have higher platform fee - 12%)
    const baseFee = platformFees.calculateServiceBookingFee(parseFloat(booking.fee.toString()), undefined, currency);
    // Override for performance bookings (12% instead of 10%)
    const performanceFee = parseFloat(booking.fee.toString()) * 0.12;
    const fixedFee = platformFees['getFixedFeeForCurrency'] ? 
      platformFees['getFixedFeeForCurrency'](currency) : 500;
    const paymentProcessingFee = (parseFloat(booking.fee.toString()) * 0.025) + fixedFee;
    const totalFees = performanceFee + paymentProcessingFee;
    const creatorPayout = parseFloat(booking.fee.toString()) - performanceFee;
    const total = parseFloat(booking.fee.toString()) + paymentProcessingFee;

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `performance_booking_${id}`,
        user_id: req.userId,
        amount: total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'performance_booking',
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
        transaction_id: `performance_booking_${id}`,
        transaction_type: 'event_booking',
        user_id: booking.performer_id,
        buyer_id: req.userId,
        subtotal: parseFloat(booking.fee.toString()),
        platform_fee: performanceFee,
        payment_processing_fee: paymentProcessingFee,
        total_fees: totalFees,
        creator_payout: creatorPayout,
        status: 'pending',
      });

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: total,
      currency: currency,
      orderId: `performance_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.client?.email || '',
      customerName: customerName || booking.client_profile?.display_name || 'Customer',
      description: `Payment for performance booking: ${booking.event_name || booking.performance_type}`,
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
    console.error('Create performance booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
