import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = express.Router();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

/**
 * Get all digital products
 */
router.get('/', async (req, res) => {
  try {
    const { creatorId, category, search } = req.query;
    
    let query = `
      SELECT dp.*, p.display_name, p.avatar_url
      FROM digital_products dp
      JOIN profiles p ON dp.creator_id = p.user_id
      WHERE dp.is_active = true
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (creatorId) {
      query += ` AND dp.creator_id = $${paramCount++}`;
      params.push(creatorId);
    }
    if (category) {
      query += ` AND dp.category = $${paramCount++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (dp.title ILIKE $${paramCount} OR dp.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY dp.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get digital products error:', error);
    res.status(500).json({ error: 'Failed to get digital products' });
  }
});

/**
 * Get digital product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT dp.*, p.display_name, p.avatar_url
       FROM digital_products dp
       JOIN profiles p ON dp.creator_id = p.user_id
       WHERE dp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get digital product error:', error);
    res.status(500).json({ error: 'Failed to get digital product' });
  }
});

/**
 * Purchase digital product
 */
router.post('/:id/purchase', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get digital product
    const productResult = await pool.query(
      `SELECT dp.*, u.email, p.display_name
       FROM digital_products dp
       JOIN users u ON dp.creator_id = u.id
       LEFT JOIN profiles p ON dp.creator_id = p.user_id
       WHERE dp.id = $1 AND dp.is_active = true`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    const product = productResult.rows[0];

    // Check if already purchased
    const purchaseCheck = await pool.query(
      `SELECT * FROM digital_product_purchases
       WHERE product_id = $1 AND buyer_id = $2 AND payment_status = 'paid'`,
      [id, req.userId]
    );

    if (purchaseCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You have already purchased this product' });
    }

    // Calculate fees
    const feeCalculation = platformFees.calculateDigitalProductFee(parseFloat(product.price));

    // Create purchase record (pending payment)
    const purchaseResult = await pool.query(
      `INSERT INTO digital_product_purchases (product_id, buyer_id, amount_paid, currency, payment_status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (product_id, buyer_id) 
       DO UPDATE SET amount_paid = $3, payment_status = 'pending', created_at = now()
       RETURNING *`,
      [id, req.userId, feeCalculation.total, 'TZS']
    );

    const purchase = purchaseResult.rows[0];

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'digital_product')
       RETURNING *`,
      [`digital_product_${id}_${req.userId}`, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        `digital_product_${id}_${req.userId}`,
        'digital_product',
        product.creator_id,
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
      orderId: `digital_product_${id}_${req.userId}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || product.email,
      customerName: customerName || product.display_name || 'Customer',
      description: `Purchase: ${product.title}`,
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
    console.error('Purchase digital product error:', error);
    res.status(500).json({ error: 'Failed to purchase digital product' });
  }
});

/**
 * Get purchased digital products for user
 */
router.get('/my/purchases', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT dpp.*, dp.title, dp.description, dp.file_url, dp.preview_url, dp.category
       FROM digital_product_purchases dpp
       JOIN digital_products dp ON dpp.product_id = dp.id
       WHERE dpp.buyer_id = $1 AND dpp.payment_status = 'paid'
       ORDER BY dpp.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

export default router;

