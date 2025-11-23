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
 * Send a tip to a creator
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { creatorId, amount, message, isAnonymous, customerPhone, customerEmail, customerName } = req.body;

    if (!creatorId || !amount || !customerPhone) {
      return res.status(400).json({ error: 'Creator ID, amount, and phone number are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Verify creator exists
    const creatorResult = await pool.query(
      `SELECT u.id, u.email, p.display_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [creatorId]
    );

    if (creatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creator = creatorResult.rows[0];

    // Calculate fees
    const feeCalculation = platformFees.calculateTipFee(parseFloat(amount));

    // Create tip record (pending payment)
    const tipResult = await pool.query(
      `INSERT INTO tips (creator_id, sender_id, amount, currency, message, is_anonymous, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        creatorId,
        isAnonymous ? null : req.userId,
        feeCalculation.total,
        'TZS',
        message || null,
        isAnonymous || false,
      ]
    );

    const tip = tipResult.rows[0];

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'tip')
       RETURNING *`,
      [`tip_${tip.id}`, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        `tip_${tip.id}`,
        'tip',
        creatorId,
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
      orderId: `tip_${tip.id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || creator.email,
      customerName: customerName || (isAnonymous ? 'Anonymous' : 'Supporter'),
      description: `Tip to ${creator.display_name || 'Creator'}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await pool.query(
        `UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [clickPesaResponse.error || 'Payment creation failed', payment.id]
      );
      await pool.query(
        `UPDATE tips SET payment_status = 'failed' WHERE id = $1`,
        [tip.id]
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
      tipId: tip.id,
      checkoutUrl: clickPesaResponse.checkoutUrl,
      message: 'Tip payment initiated successfully',
    });
  } catch (error: any) {
    console.error('Send tip error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

/**
 * Get tips received by creator
 */
router.get('/received', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              CASE WHEN t.is_anonymous THEN NULL ELSE p.display_name END as sender_name,
              CASE WHEN t.is_anonymous THEN NULL ELSE u.email END as sender_email
       FROM tips t
       LEFT JOIN users u ON t.sender_id = u.id
       LEFT JOIN profiles p ON t.sender_id = p.user_id
       WHERE t.creator_id = $1
       ORDER BY t.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get received tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

/**
 * Get tips sent by user
 */
router.get('/sent', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.display_name as creator_name
       FROM tips t
       JOIN profiles p ON t.creator_id = p.user_id
       WHERE t.sender_id = $1
       ORDER BY t.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get sent tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

export default router;

