import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';

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
    const result = await pool.query(
      'SELECT * FROM artisan_services WHERE artisan_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Create service
router.post('/services', authenticate, requireRole('artisan'), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, skills, hourlyRate, dailyRate, fixedPrice, pricingType, location, serviceArea, portfolioImages, isAvailable } = req.body;
    const result = await pool.query(
      `INSERT INTO artisan_services (
        artisan_id, title, description, category, skills, hourly_rate, daily_rate, 
        fixed_price, pricing_type, location, service_area, portfolio_images, is_available
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.userId,
        title,
        description,
        category,
        skills || [],
        hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate ? parseFloat(dailyRate) : null,
        fixedPrice ? parseFloat(fixedPrice) : null,
        pricingType,
        location || null,
        serviceArea || [],
        portfolioImages || [],
        isAvailable !== undefined ? isAvailable : true,
      ]
    );
    res.status(201).json(result.rows[0]);
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
    const result = await pool.query(
      'SELECT id FROM artisan_services WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Delete service
    await pool.query('DELETE FROM artisan_services WHERE id = $1', [id]);

    res.json({ message: 'Service deleted successfully' });
  } catch (error: any) {
    console.error('Delete artisan service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Get bookings
router.get('/bookings', authenticate, requireRole('artisan'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT ab.*, 
              asv.title as service_title,
              u.email, 
              p.display_name
       FROM artisan_bookings ab
       JOIN artisan_services asv ON ab.service_id = asv.id
       JOIN users u ON ab.client_id = u.id
       LEFT JOIN profiles p ON ab.client_id = p.user_id
       WHERE asv.user_id = $1
       ORDER BY ab.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
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
    const serviceResult = await pool.query(
      `SELECT s.id, s.user_id, s.title, u.email as artisan_email, p.display_name as artisan_name
       FROM artisan_services s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON s.user_id = p.user_id
       WHERE s.id = $1 AND s.status = 'active'`,
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found or inactive' });
    }

    const service = serviceResult.rows[0];

    // Create booking
    const result = await pool.query(
      `INSERT INTO artisan_bookings (
        service_id, client_name, client_email, client_phone,
        booking_date, start_time, end_time, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [
        serviceId, clientName, clientEmail, clientPhone,
        bookingDate, startTime, endTime || null, notes || null
      ]
    );

    const booking = result.rows[0];

    res.status(201).json({
      ...booking,
      service_title: service.title,
      artisan_email: service.artisan_email,
      artisan_name: service.artisan_name
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

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT ab.*, 
              asv.title as service_title, asv.user_id as creator_id,
              u.email, p.display_name, p.phone
       FROM artisan_bookings ab
       JOIN artisan_services asv ON ab.service_id = asv.id
       JOIN users u ON ab.client_id = u.id
       LEFT JOIN profiles p ON ab.client_id = p.user_id
       WHERE ab.id = $1 AND ab.client_id = $2`,
      [id, req.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // For artisan services, we might need to define pricing
    // For now, we'll use a default amount or get it from the service
    const serviceResult = await pool.query(
      'SELECT fixed_price, hourly_rate, daily_rate, pricing_type FROM artisan_services WHERE id = $1',
      [booking.service_id]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];
    let totalAmount = 0;

    // Calculate amount based on service pricing
    if (service.pricing_type === 'fixed' && service.fixed_price) {
      totalAmount = parseFloat(service.fixed_price);
    } else if (service.pricing_type === 'hourly' && service.hourly_rate) {
      // For hourly services, we might need additional info about duration
      // For now, we'll use a default of 1 hour
      totalAmount = parseFloat(service.hourly_rate);
    } else if (service.pricing_type === 'daily' && service.daily_rate) {
      // For daily services, we might need additional info about duration
      // For now, we'll use a default of 1 day
      totalAmount = parseFloat(service.daily_rate);
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Service has no valid pricing' });
    }

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount);

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'artisan_service')
       RETURNING *`,
      [id, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        id,
        'artisan_service',
        booking.creator_id,
        req.userId,
        feeCalculation.subtotal,
        feeCalculation.platformFee,
        feeCalculation.paymentProcessingFee,
        feeCalculation.totalFees,
        feeCalculation.creatorPayout,
      ]
    );

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: 'TZS',
      orderId: `artisan_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.email,
      customerName: customerName || booking.display_name || 'Customer',
      description: `Payment for artisan service: ${booking.service_title}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await pool.query(
        `UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [clickPesaResponse.error || 'Payment creation failed', payment.id]
      );
      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await pool.query(
      `UPDATE payments 
       SET payment_id = $1, transaction_id = $2, checkout_url = $3, status = 'initiated'
       WHERE id = $4`,
      [
        clickPesaResponse.paymentId,
        clickPesaResponse.transactionId,
        clickPesaResponse.checkoutUrl,
        payment.id,
      ]
    );

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

