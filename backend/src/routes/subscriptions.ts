import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { platformFees } from '../services/platformFees.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Click Pesa service
const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

// Platform subscription tiers
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    features: [
      'Basic profile', 
      '5 product listings', 
      'Standard support',
      '8% marketplace fees',
      '6% digital product fees',
      '10% service booking fees',
      '12% commission work fees'
    ],
    limits: { products: 5, portfolios: 3 },
  },
  creator: {
    name: 'Creator',
    monthlyPrice: 15000, // TZS 15,000
    features: [
      'Unlimited listings', 
      'Advanced analytics', 
      'Priority support', 
      'Featured listings',
      'Reduced 5% subscription fees',
      'Standard transaction fees'
    ],
    limits: { products: -1, portfolios: -1 }, // -1 = unlimited
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 40000, // TZS 40,000
    features: [
      'All Creator features', 
      'Marketing tools', 
      'API access', 
      'Custom branding',
      'Lower 5% subscription fees',
      'Priority transaction processing'
    ],
    limits: { products: -1, portfolios: -1 },
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    features: [
      'All Professional features', 
      'Custom integrations', 
      'Dedicated support',
      'Custom fee structure',
      'White-label options',
      'Dedicated account manager'
    ],
    limits: { products: -1, portfolios: -1 },
  },
};

/**
 * Get current subscription
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if table exists, if not return free tier
    try {
      const result = await pool.query(
        `SELECT * FROM platform_subscriptions WHERE user_id = $1`,
        [req.userId]
      );

      if (result.rows.length === 0) {
        // Return free tier as default
        return res.json({
          tier: 'free',
          ...SUBSCRIPTION_TIERS.free,
          status: 'active',
        });
      }

      const subscription = result.rows[0];
      const tierKey = subscription.tier as keyof typeof SUBSCRIPTION_TIERS;
      const tierInfo = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.free;

      res.json({
        ...subscription,
        ...tierInfo,
      });
    } catch (dbError: any) {
      // If table doesn't exist, return free tier
      if (dbError.message && dbError.message.includes('does not exist')) {
        return res.json({
          tier: 'free',
          ...SUBSCRIPTION_TIERS.free,
          status: 'active',
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription', details: error.message });
  }
});

/**
 * Subscribe to a tier
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tier } = req.body;

    if (!tier || !SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    if (tier === 'free') {
      // Free tier - just update or create
      await pool.query(
        `INSERT INTO platform_subscriptions (user_id, tier, monthly_price, current_period_start, current_period_end, status, payment_status)
         VALUES ($1, $2, $3, now(), now() + interval '1 month', 'active', 'paid')
         ON CONFLICT (user_id) DO UPDATE
         SET tier = $2, monthly_price = $3, current_period_start = now(), 
             current_period_end = now() + interval '1 month', status = 'active', payment_status = 'paid', updated_at = now()`,
        [req.userId, tier, tierInfo.monthlyPrice]
      );

      return res.json({ message: 'Subscribed to free tier', tier, requiresPayment: false });
    }

    // Paid tiers require payment
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Calculate subscription fee
    const feeCalculation = platformFees.calculateSubscriptionFee(tierInfo.monthlyPrice);
    const transactionId = `subscription_${req.userId}_${Date.now()}`;

    // Create subscription record (pending payment)
    const subscriptionResult = await pool.query(
      `INSERT INTO platform_subscriptions (user_id, tier, monthly_price, current_period_start, current_period_end, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'pending')
       ON CONFLICT (user_id) DO UPDATE
       SET tier = $2, monthly_price = $3, current_period_start = $4, 
           current_period_end = $5, status = 'pending', payment_status = 'pending', updated_at = now()
       RETURNING *`,
      [req.userId, tier, tierInfo.monthlyPrice, now, periodEnd]
    );

    const subscription = subscriptionResult.rows[0];

    // Record platform fee for subscription
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        transactionId,
        'subscription',
        req.userId,
        tierInfo.monthlyPrice,
        feeCalculation.platformFee,
        feeCalculation.paymentProcessingFee,
        feeCalculation.totalFees,
        feeCalculation.creatorPayout,
      ]
    );

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa')
       RETURNING *`,
      [transactionId, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    res.json({
      message: 'Subscription created, payment required',
      tier,
      monthlyPrice: tierInfo.monthlyPrice,
      totalAmount: feeCalculation.total,
      feeBreakdown: feeCalculation,
      subscriptionId: subscription.id,
      paymentId: payment.id,
      requiresPayment: true,
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Create Click Pesa payment for subscription
 */
router.post('/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { paymentId, customerPhone, customerEmail, customerName } = req.body;

    if (!paymentId || !customerPhone) {
      return res.status(400).json({ error: 'Payment ID and customer phone are required' });
    }

    // Get payment details
    const paymentResult = await pool.query(
      `SELECT p.*, ps.tier, u.email, pr.display_name, pr.phone
       FROM payments p
       JOIN platform_subscriptions ps ON p.order_id LIKE 'subscription_' || ps.user_id || '%'
       JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles pr ON p.user_id = pr.user_id
       WHERE p.id = $1 AND p.user_id = $2`,
      [paymentId, req.userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is not in pending status' });
    }

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: parseFloat(payment.amount),
      currency: 'TZS',
      orderId: payment.order_id,
      customerPhone: customerPhone,
      customerEmail: customerEmail || payment.email,
      customerName: customerName || payment.display_name || 'Customer',
      description: `Subscription payment for ${payment.tier} tier`,
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
      checkoutUrl: clickPesaResponse.checkoutUrl,
      paymentId: payment.id,
      message: 'Payment created successfully',
    });
  } catch (error: any) {
    console.error('Create subscription payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE platform_subscriptions
       SET cancel_at_period_end = true, updated_at = now()
       WHERE user_id = $1`,
      [req.userId]
    );

    res.json({ message: 'Subscription will be cancelled at end of period' });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Get all subscription tiers (public)
 */
router.get('/tiers', async (req, res) => {
  try {
    res.json(SUBSCRIPTION_TIERS);
  } catch (error: any) {
    console.error('Get tiers error:', error);
    res.status(500).json({ error: 'Failed to get tiers' });
  }
});

/**
 * Admin: Get all subscriptions
 */
router.get('/all', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, u.email, p.display_name
       FROM platform_subscriptions ps
       JOIN users u ON ps.user_id = u.id
       LEFT JOIN profiles p ON ps.user_id = p.user_id
       ORDER BY ps.created_at DESC`
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

export default router;
