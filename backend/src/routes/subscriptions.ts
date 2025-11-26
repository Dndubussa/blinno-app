import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { platformFees } from '../services/platformFees.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import dotenv from 'dotenv';
import { userPreferences } from '../services/userPreferences.js';

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

// Percentage-based pricing tiers
const PERCENTAGE_TIERS = {
  basic: {
    name: 'Basic',
    feeRate: 0.08, // 8%
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
  premium: {
    name: 'Premium',
    feeRate: 0.05, // 5%
    features: [
      'Unlimited listings',
      'Advanced analytics',
      'Priority support',
      'Featured listings',
      'Reduced 5% marketplace fees',
      '6% digital product fees',
      '8% service booking fees',
      '10% commission work fees'
    ],
    limits: { products: -1, portfolios: -1 },
  },
  pro: {
    name: 'Professional',
    feeRate: 0.03, // 3%
    features: [
      'All Premium features',
      'Marketing tools',
      'API access',
      'Custom branding',
      'Reduced 3% marketplace fees',
      '4% digital product fees',
      '6% service booking fees',
      '8% commission work fees'
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

    const { data: subscription, error } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Return free tier as default
      return res.json({
        tier: 'free',
        pricing_model: 'subscription',
        ...SUBSCRIPTION_TIERS.free,
        status: 'active',
      });
    }

    if (error) {
      throw error;
    }

    const tierKey = subscription.tier as keyof typeof SUBSCRIPTION_TIERS;
    const tierInfo = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.free;

    res.json({
      ...subscription,
      ...tierInfo,
    });
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

    // Handle percentage-based tiers
    if (tier && tier.startsWith('percentage-')) {
      const percentageTierKey = tier.replace('percentage-', '') as keyof typeof PERCENTAGE_TIERS;
      
      if (!PERCENTAGE_TIERS[percentageTierKey]) {
        return res.status(400).json({ error: 'Invalid percentage tier' });
      }

      const tierInfo = PERCENTAGE_TIERS[percentageTierKey];

      // For percentage-based tiers, we just update the user's subscription record
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .upsert({
          user_id: req.userId,
          tier: 'percentage',
          pricing_model: 'percentage',
          percentage_tier: percentageTierKey,
          monthly_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          payment_status: 'paid',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({ 
        message: 'Subscribed to percentage-based tier', 
        tier: 'percentage', 
        percentage_tier: percentageTierKey,
        pricing_model: 'percentage',
        requiresPayment: false 
      });
    }

    // Handle subscription-based tiers
    if (!tier || !SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    if (tier === 'free') {
      // Free tier - just update or create
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .upsert({
          user_id: req.userId,
          tier: tier,
          pricing_model: 'subscription',
          monthly_price: tierInfo.monthlyPrice,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          payment_status: 'paid',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({ 
        message: 'Subscribed to free tier', 
        tier, 
        pricing_model: 'subscription',
        requiresPayment: false 
      });
    }

    // Paid tiers require payment
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Calculate subscription fee
    const feeCalculation = platformFees.calculateSubscriptionFee(tierInfo.monthlyPrice);
    const transactionId = `subscription_${req.userId}_${Date.now()}`;

    // Create subscription record (pending payment)
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .upsert({
        user_id: req.userId,
        tier: tier,
        pricing_model: 'subscription',
        monthly_price: tierInfo.monthlyPrice,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        status: 'pending',
        payment_status: 'pending',
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (subError || !subscription) {
      throw subError;
    }

    // Record platform fee for subscription
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: transactionId,
        transaction_type: 'subscription',
        user_id: req.userId,
        subtotal: tierInfo.monthlyPrice,
        platform_fee: feeCalculation.platformFee,
        payment_processing_fee: feeCalculation.paymentProcessingFee,
        total_fees: feeCalculation.totalFees,
        creator_payout: feeCalculation.creatorPayout,
        status: 'pending',
      });

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: transactionId,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: 'TZS',
        status: 'pending',
        payment_method: 'clickpesa',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    res.json({
      message: 'Subscription created, payment required',
      tier,
      pricing_model: 'subscription',
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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'TZS';

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        platform_subscriptions!inner(tier)
      `)
      .eq('id', paymentId)
      .eq('user_id', req.userId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is not in pending status' });
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', req.userId)
      .single();

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: parseFloat(payment.amount.toString()),
      currency: currency,
      orderId: payment.order_id,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || profile?.display_name || 'Customer',
      description: `Subscription payment for ${(payment as any).platform_subscriptions?.tier || 'tier'}`,
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
    const { error } = await supabase
      .from('platform_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId);

    if (error) {
      throw error;
    }

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
    res.json({
      subscription: SUBSCRIPTION_TIERS,
      percentage: PERCENTAGE_TIERS
    });
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
    const { data, error } = await supabase
      .from('platform_subscriptions')
      .select(`
        *,
        users!platform_subscriptions_user_id_fkey(email),
        profiles!platform_subscriptions_user_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((sub: any) => ({
      ...sub,
      email: sub.users?.email,
      display_name: sub.profiles?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

export default router;
