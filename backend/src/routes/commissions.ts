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
 * Get commissions for creator
 */
router.get('/my-commissions', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              CASE WHEN c.client_id IS NULL THEN NULL ELSE p.display_name END as client_name,
              CASE WHEN c.client_id IS NULL THEN NULL ELSE u.email END as client_email
       FROM commissions c
       LEFT JOIN users u ON c.client_id = u.id
       LEFT JOIN profiles p ON c.client_id = p.user_id
       WHERE c.creator_id = $1
       ORDER BY c.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

/**
 * Get commissions for client
 */
router.get('/my-requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.display_name as creator_name
       FROM commissions c
       JOIN profiles p ON c.creator_id = p.user_id
       WHERE c.client_id = $1
       ORDER BY c.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get commission requests error:', error);
    res.status(500).json({ error: 'Failed to get commission requests' });
  }
});

/**
 * Create commission request
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { creatorId, title, description, budget, deadline, requirements } = req.body;

    if (!creatorId || !title || !budget) {
      return res.status(400).json({ error: 'Creator ID, title, and budget are required' });
    }

    const result = await pool.query(
      `INSERT INTO commissions (creator_id, client_id, title, description, budget, deadline, requirements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        creatorId,
        req.userId,
        title,
        description || null,
        parseFloat(budget),
        deadline || null,
        requirements || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create commission error:', error);
    res.status(500).json({ error: 'Failed to create commission' });
  }
});

/**
 * Update commission status (creator accepts/rejects)
 */
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Verify creator owns this commission
    const checkResult = await pool.query(
      'SELECT creator_id FROM commissions WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (checkResult.rows[0].creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE commissions
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update commission status error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

/**
 * Pay for commission (client pays after commission is completed)
 */
router.post('/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get commission details
    const commissionResult = await pool.query(
      `SELECT c.*, u.email, p.display_name
       FROM commissions c
       JOIN users u ON c.client_id = u.id
       LEFT JOIN profiles p ON c.client_id = p.user_id
       WHERE c.id = $1 AND c.client_id = $2`,
      [id, req.userId]
    );

    if (commissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const commission = commissionResult.rows[0];

    if (commission.status !== 'completed') {
      return res.status(400).json({ error: 'Commission must be completed before payment' });
    }

    if (commission.payment_status === 'paid') {
      return res.status(400).json({ error: 'Commission already paid' });
    }

    // Calculate fees
    const feeCalculation = platformFees.calculateCommissionFee(parseFloat(commission.budget));

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'commission')
       RETURNING *`,
      [`commission_${id}`, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        `commission_${id}`,
        'commission',
        commission.creator_id,
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
      orderId: `commission_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || commission.email,
      customerName: customerName || commission.display_name || 'Customer',
      description: `Payment for commission: ${commission.title}`,
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
    console.error('Create commission payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;

