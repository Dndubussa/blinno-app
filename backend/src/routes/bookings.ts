import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import { notificationService } from '../services/notifications.js';
import dotenv from 'dotenv';

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

    let query = '';
    if (type === 'creator') {
      query = `
        SELECT b.*, 
               u1.email as user_email, p1.display_name as user_name,
               u2.email as creator_email, p2.display_name as creator_name
        FROM bookings b
        JOIN users u1 ON b.user_id = u1.id
        JOIN profiles p1 ON b.user_id = p1.user_id
        JOIN users u2 ON b.creator_id = u2.id
        JOIN profiles p2 ON b.creator_id = p2.user_id
        WHERE b.creator_id = $1
        ORDER BY b.created_at DESC
      `;
    } else {
      query = `
        SELECT b.*, 
               u1.email as user_email, p1.display_name as user_name,
               u2.email as creator_email, p2.display_name as creator_name
        FROM bookings b
        JOIN users u1 ON b.user_id = u1.id
        JOIN profiles p1 ON b.user_id = p1.user_id
        JOIN users u2 ON b.creator_id = u2.id
        JOIN profiles p2 ON b.creator_id = p2.user_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
      `;
    }

    const result = await pool.query(query, [req.userId]);
    res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO bookings (user_id, creator_id, service_type, start_date, end_date, total_amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        req.userId,
        creatorId,
        serviceType,
        startDate,
        endDate || null,
        totalAmount ? parseFloat(totalAmount) : null,
        notes || null
      ]
    );

    const booking = result.rows[0];

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
    const checkResult = await pool.query(
      'SELECT user_id, creator_id FROM bookings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const existingBooking = checkResult.rows[0];
    if (existingBooking.user_id !== req.userId && existingBooking.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    const booking = result.rows[0];

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

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT b.*, u.email, p.display_name, p.phone
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN profiles p ON b.user_id = p.user_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (!booking.total_amount || booking.total_amount <= 0) {
      return res.status(400).json({ error: 'Booking has no amount to pay' });
    }

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(parseFloat(booking.total_amount));

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'service_booking')
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
        'service_booking',
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
      orderId: `service_booking_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.email,
      customerName: customerName || booking.display_name || 'Customer',
      description: `Payment for service booking: ${booking.service_type}`,
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
    console.error('Create service booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;

