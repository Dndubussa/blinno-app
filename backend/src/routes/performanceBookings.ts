import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
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

/**
 * Get performance bookings for performer
 */
router.get('/my-bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT pb.*, p.display_name as client_name
       FROM performance_bookings pb
       JOIN profiles p ON pb.client_id = p.user_id
       WHERE pb.performer_id = $1
       ORDER BY pb.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
    const result = await pool.query(
      `SELECT pb.*, p.display_name as performer_name
       FROM performance_bookings pb
       JOIN profiles p ON pb.performer_id = p.user_id
       WHERE pb.client_id = $1
       ORDER BY pb.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO performance_bookings (
        performer_id, client_id, performance_type, event_name, venue, 
        performance_date, duration_hours, fee, requirements, notes, status, payment_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending')
       RETURNING *`,
      [
        performerId,
        req.userId,
        performanceType,
        eventName || null,
        venue || null,
        performanceDate,
        durationHours ? parseFloat(durationHours) : null,
        parseFloat(fee),
        requirements || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT performer_id FROM performance_bookings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (checkResult.rows[0].performer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE performance_bookings
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);
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

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT pb.*, u.email, p.display_name
       FROM performance_bookings pb
       JOIN users u ON pb.client_id = u.id
       LEFT JOIN profiles p ON pb.client_id = p.user_id
       WHERE pb.id = $1 AND pb.client_id = $2`,
      [id, req.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed before payment' });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    // Calculate fees (performance bookings have higher platform fee - 12%)
    const feeCalculation = platformFees.calculateServiceBookingFee(parseFloat(booking.fee));
    // Override for performance bookings (12% instead of 10%)
    const performanceFee = parseFloat(booking.fee) * 0.12;
    const paymentProcessingFee = (parseFloat(booking.fee) * 0.025) + 500;
    const totalFees = performanceFee + paymentProcessingFee;
    const creatorPayout = parseFloat(booking.fee) - performanceFee;
    const total = parseFloat(booking.fee) + paymentProcessingFee;

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'performance_booking')
       RETURNING *`,
      [`performance_booking_${id}`, req.userId, total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        `performance_booking_${id}`,
        'event_booking',
        booking.performer_id,
        req.userId,
        parseFloat(booking.fee),
        performanceFee,
        paymentProcessingFee,
        totalFees,
        creatorPayout,
      ]
    );

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: total,
      currency: 'TZS',
      orderId: `performance_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.email,
      customerName: customerName || booking.display_name || 'Customer',
      description: `Payment for performance booking: ${booking.event_name || booking.performance_type}`,
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
    console.error('Create performance booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;

