import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
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

// Get services for current artisan
router.get('/services', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('artisan_services')
      .select('*')
      .eq('artisan_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Create service
router.post('/services', authenticate, requireRole('artisan'), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, skills, hourlyRate, dailyRate, fixedPrice, pricingType, location, serviceArea, portfolioImages, isAvailable } = req.body;
    
    const { data, error } = await supabase
      .from('artisan_services')
      .insert({
        artisan_id: req.userId,
        title,
        description,
        category,
        skills: skills || [],
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        fixed_price: fixedPrice ? parseFloat(fixedPrice) : null,
        pricing_type: pricingType,
        location: location || null,
        service_area: serviceArea || [],
        portfolio_images: portfolioImages || [],
        is_available: isAvailable !== undefined ? isAvailable : true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

/**
 * Delete artisan service
 */
router.delete('/services/:id', authenticate, requireRole('artisan'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if service belongs to user
    const { data: existing } = await supabase
      .from('artisan_services')
      .select('id')
      .eq('id', id)
      .eq('artisan_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Delete service
    const { error } = await supabase
      .from('artisan_services')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error: any) {
    console.error('Delete artisan service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Get bookings
router.get('/bookings', authenticate, requireRole('artisan'), async (req: AuthRequest, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('artisan_bookings')
      .select(`
        *,
        service:artisan_services!inner(title),
        client:users!artisan_bookings_client_id_fkey(email),
        client_profile:profiles!artisan_bookings_client_id_fkey(display_name)
      `)
      .eq('service.artisan_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (bookings || []).map((ab: any) => ({
      ...ab,
      service_title: ab.service?.title,
      email: ab.client?.email,
      display_name: ab.client_profile?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Create artisan service booking - NEW
router.post('/bookings', async (req, res) => {
  try {
    const {
      serviceId, clientName, clientEmail, clientPhone,
      bookingDate, startTime, endTime, notes
    } = req.body;

    // Validate required fields
    if (!serviceId || !clientName || !clientEmail || !clientPhone || !bookingDate || !startTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: serviceId, clientName, clientEmail, clientPhone, bookingDate, startTime' 
      });
    }

    // Verify service exists
    const { data: service, error: serviceError } = await supabase
      .from('artisan_services')
      .select(`
        *,
        artisan:users!artisan_services_artisan_id_fkey(email),
        artisan_profile:profiles!artisan_services_artisan_id_fkey(display_name)
      `)
      .eq('id', serviceId)
      .eq('is_available', true)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: 'Service not found or inactive' });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('artisan_bookings')
      .insert({
        service_id: serviceId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError;
    }

    res.status(201).json({
      ...booking,
      service_title: service.title,
      artisan_email: service.artisan?.email,
      artisan_name: service.artisan_profile?.display_name
    });
  } catch (error: any) {
    console.error('Create artisan booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * Pay for artisan service booking
 */
router.post('/bookings/:id/payment', authenticate, async (req: AuthRequest, res) => {
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
      .from('artisan_bookings')
      .select(`
        *,
        service:artisan_services!inner(title, artisan_id, pricing_type, hourly_rate, daily_rate, fixed_price),
        client:users!artisan_bookings_client_id_fkey(email),
        client_profile:profiles!artisan_bookings_client_id_fkey(display_name, phone)
      `)
      .eq('id', id)
      .eq('client_id', req.userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Calculate total based on service pricing
    let totalAmount = 0;
    if (booking.service?.pricing_type === 'hourly' && booking.service.hourly_rate) {
      // For hourly services, we might need additional info about duration
      // For now, we'll use a default of 1 hour
      totalAmount = parseFloat(booking.service.hourly_rate.toString());
    } else if (booking.service?.pricing_type === 'daily' && booking.service.daily_rate) {
      // For daily services, we might need additional info about duration
      // For now, we'll use a default of 1 day
      totalAmount = parseFloat(booking.service.daily_rate.toString());
    } else if (booking.service?.pricing_type === 'fixed' && booking.service.fixed_price) {
      totalAmount = parseFloat(booking.service.fixed_price.toString());
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Service has no valid pricing' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount, undefined, undefined, currency);

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
        payment_type: 'artisan_service',
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
        transaction_type: 'artisan_service',
        user_id: booking.service.artisan_id,
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
      orderId: `artisan_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.client?.email || '',
      customerName: customerName || booking.client_profile?.display_name || 'Customer',
      description: `Payment for artisan service: ${booking.service.title}`,
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
    console.error('Create artisan booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
