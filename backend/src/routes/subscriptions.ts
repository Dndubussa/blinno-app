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

// Percentage-based pricing tiers with volume requirements (SaaS model - no monthly subscriptions)
const PERCENTAGE_TIERS = {
  basic: {
    name: 'Basic',
    feeRate: 0.08, // 8% transaction fee (primary rate shown)
    volumeRequirement: null, // No volume requirement
    features: [
      'Basic profile',
      '5 product listings',
      'Standard support',
      '8% marketplace transaction fees',
      '6% digital product fees',
      '10% service booking fees',
      '12% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: 5, portfolios: 3 },
  },
  premium: {
    name: 'Premium',
    feeRate: 0.06, // 6% transaction fee (primary rate shown)
    volumeRequirement: {
      salesAmount: 500, // $500/month in sales
      transactionCount: 50, // OR 50 transactions/month
    },
    features: [
      'Unlimited listings',
      'Advanced analytics',
      'Priority support',
      'Featured listings',
      'Reduced 6% marketplace fees',
      '5% digital product fees',
      '8% service booking fees',
      '10% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: -1, portfolios: -1 },
  },
  pro: {
    name: 'Professional',
    feeRate: 0.05, // 5% transaction fee (primary rate shown) - increased from 3% for profitability
    volumeRequirement: {
      salesAmount: 2000, // $2,000/month in sales
      transactionCount: 200, // OR 200 transactions/month
    },
    features: [
      'All Premium features',
      'Marketing tools',
      'API access',
      'Custom branding',
      'Reduced 5% marketplace fees',
      '4% digital product fees',
      '7% service booking fees',
      '9% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: -1, portfolios: -1 },
  },
};

// Subscription-based pricing tiers (monthly fee + reduced transaction fees)
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    features: [
      'Basic profile',
      '5 product listings',
      'Standard support',
      '8% marketplace transaction fees',
      '6% digital product fees',
      '10% service booking fees',
      '12% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: 5, portfolios: 3 },
    // Transaction fees same as percentage-based basic tier
    feeReduction: 0, // No reduction
  },
  creator: {
    name: 'Creator',
    monthlyPrice: 15, // USD 15/month
    features: [
      'Unlimited listings',
      'Advanced analytics',
      'Priority support',
      'Featured listings',
      'Reduced 5% marketplace fees',
      '4% digital product fees',
      '7% service booking fees',
      '9% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: -1, portfolios: -1 },
    feeReduction: 0.03, // 3% reduction (5% vs 8% base)
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 40, // USD 40/month
    features: [
      'All Creator features',
      'Marketing tools',
      'API access',
      'Custom branding',
      'Reduced 4% marketplace fees',
      '3% digital product fees',
      '6% service booking fees',
      '8% commission work fees',
      '3% tips/donations fees'
    ],
    limits: { products: -1, portfolios: -1 },
    feeReduction: 0.04, // 4% reduction (4% vs 8% base)
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 100, // USD 100/month
    features: [
      'All Professional features',
      'Custom integrations',
      'Dedicated support',
      'Best transaction rates (3% marketplace)',
      'White-label options',
      'Dedicated account manager',
      'Priority feature requests',
      'Custom API access'
    ],
    limits: { products: -1, portfolios: -1 },
    feeReduction: 0.05, // 5% reduction (3% vs 8% base) - best rates
  },
};

// Minimum platform fee per transaction (ensures profitability on small sales)
const MINIMUM_PLATFORM_FEE = 0.25; // $0.25 USD

/**
 * Get user's monthly sales volume for tier eligibility
 */
async function getUserMonthlyVolume(userId: string): Promise<{ salesAmount: number; transactionCount: number }> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all completed transactions this month
    const { data: transactions, error } = await supabase
      .from('platform_fees')
      .select('subtotal, transaction_type')
      .eq('user_id', userId)
      .eq('status', 'collected')
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error fetching user volume:', error);
      return { salesAmount: 0, transactionCount: 0 };
    }

    const salesAmount = (transactions || []).reduce((sum, t) => sum + parseFloat(t.subtotal.toString()), 0);
    const transactionCount = (transactions || []).length;

    return { salesAmount, transactionCount };
  } catch (error) {
    console.error('Error calculating user volume:', error);
    return { salesAmount: 0, transactionCount: 0 };
  }
}

/**
 * Check if user is eligible for a tier based on volume requirements
 */
async function checkTierEligibility(userId: string, tierKey: keyof typeof PERCENTAGE_TIERS): Promise<{ eligible: boolean; reason?: string; currentVolume?: { salesAmount: number; transactionCount: number } }> {
  const tier = PERCENTAGE_TIERS[tierKey];
  
  // Basic tier has no requirements
  if (tierKey === 'basic' || !tier.volumeRequirement) {
    return { eligible: true };
  }

  const volume = await getUserMonthlyVolume(userId);
  const requirement = tier.volumeRequirement!;

  // Check if user meets either sales amount OR transaction count requirement
  const meetsSalesAmount = volume.salesAmount >= requirement.salesAmount;
  const meetsTransactionCount = volume.transactionCount >= requirement.transactionCount;

  if (meetsSalesAmount || meetsTransactionCount) {
    return { eligible: true, currentVolume: volume };
  }

  return {
    eligible: false,
    reason: `Requires $${requirement.salesAmount} in monthly sales OR ${requirement.transactionCount} transactions/month`,
    currentVolume: volume,
  };
}

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
      // Return basic tier as default (percentage-based)
      return res.json({
        tier: 'percentage',
        pricing_model: 'percentage',
        percentage_tier: 'basic',
        ...PERCENTAGE_TIERS.basic,
        status: 'active',
      });
    }

    if (error) {
      throw error;
    }

    // Handle percentage-based subscriptions
    if (subscription.pricing_model === 'percentage' && subscription.percentage_tier) {
      const tierKey = subscription.percentage_tier as keyof typeof PERCENTAGE_TIERS;
      const tierInfo = PERCENTAGE_TIERS[tierKey] || PERCENTAGE_TIERS.basic;
      
      // Get current volume for tier eligibility display
      const volume = await getUserMonthlyVolume(req.userId!);
      const eligibility = await checkTierEligibility(req.userId!, tierKey);
      
      return res.json({
        ...subscription,
        ...tierInfo,
        currentVolume: volume,
        tierEligible: eligibility.eligible,
      });
    }

    // Handle subscription-based subscriptions
    if (subscription.pricing_model === 'subscription' && subscription.tier) {
      const tierKey = subscription.tier as keyof typeof SUBSCRIPTION_TIERS;
      const tierInfo = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.free;
      
      return res.json({
        ...subscription,
        ...tierInfo,
      });
    }

    // Default to basic percentage tier
    const tierInfo = PERCENTAGE_TIERS.basic;
    return res.json({
      ...subscription,
      tier: 'percentage',
      pricing_model: 'percentage',
      percentage_tier: 'basic',
      ...tierInfo,
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription', details: error.message });
  }
});

/**
 * Subscribe to a tier (supports both percentage-based and subscription-based)
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tier, pricingModel } = req.body;

    // Determine pricing model from tier prefix or explicit parameter
    let model: 'percentage' | 'subscription' = pricingModel || 'percentage';
    let tierKey: string = tier;

    if (tier && tier.startsWith('percentage-')) {
      model = 'percentage';
      tierKey = tier.replace('percentage-', '');
    } else if (tier && tier.startsWith('subscription-')) {
      model = 'subscription';
      tierKey = tier.replace('subscription-', '');
    }

    // Handle percentage-based tiers
    if (model === 'percentage') {
      const percentageTierKey = tierKey as keyof typeof PERCENTAGE_TIERS;
      
      if (!PERCENTAGE_TIERS[percentageTierKey]) {
        return res.status(400).json({ 
          error: 'Invalid percentage tier. Available: basic, premium, pro' 
        });
      }

      const tierInfo = PERCENTAGE_TIERS[percentageTierKey];

      // Check tier eligibility based on volume requirements
      const eligibility = await checkTierEligibility(req.userId!, percentageTierKey);
      
      if (!eligibility.eligible) {
        return res.status(403).json({
          error: 'Tier eligibility requirement not met',
          message: eligibility.reason,
          currentVolume: eligibility.currentVolume,
          requirement: tierInfo.volumeRequirement,
        });
      }

      // For percentage-based tiers, no payment required
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .upsert({
          user_id: req.userId,
          tier: 'percentage',
          pricing_model: 'percentage',
          percentage_tier: percentageTierKey,
          monthly_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          status: 'active',
          payment_status: 'paid',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({ 
        ...data, // Include all database fields (id, created_at, etc.)
        message: `Subscribed to ${tierInfo.name} tier (percentage-based)`, 
        tier: 'percentage', 
        percentage_tier: percentageTierKey,
        pricing_model: 'percentage',
        ...tierInfo,
        currentVolume: eligibility.currentVolume,
        requiresPayment: false 
      });
    }

    // Handle subscription-based tiers
    if (model === 'subscription') {
      const subscriptionTierKey = tierKey as keyof typeof SUBSCRIPTION_TIERS;
      
      if (!SUBSCRIPTION_TIERS[subscriptionTierKey]) {
        return res.status(400).json({ 
          error: 'Invalid subscription tier. Available: free, creator, professional, enterprise' 
        });
      }

      const tierInfo = SUBSCRIPTION_TIERS[subscriptionTierKey];

      // Free tier - no payment required
      if (subscriptionTierKey === 'free') {
        const { data, error } = await supabase
          .from('platform_subscriptions')
          .upsert({
            user_id: req.userId,
            tier: subscriptionTierKey,
            pricing_model: 'subscription',
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
          ...subscription, // Include all database fields (id, created_at, etc.)
          message: `Subscribed to ${tierInfo.name} tier`, 
          tier: subscriptionTierKey,
          pricing_model: 'subscription',
          ...tierInfo,
          requiresPayment: false 
        });
      }

      // Enterprise tier - requires payment like other paid tiers

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
          tier: subscriptionTierKey,
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
          currency: 'USD',
          status: 'pending',
          payment_method: 'clickpesa',
        })
        .select()
        .single();

      if (paymentError || !payment) {
        throw paymentError;
      }

      return res.json({
        message: 'Subscription created, payment required',
        tier: subscriptionTierKey,
        pricing_model: 'subscription',
        totalAmount: feeCalculation.total,
        feeBreakdown: feeCalculation,
        subscriptionId: subscription.id,
        paymentId: payment.id,
        ...tierInfo,
        requiresPayment: true,
      });
    }

    return res.status(400).json({ error: 'Invalid pricing model' });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
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
    const currency = userPrefs.currency || 'USD';

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

    // Get subscription info to determine pricing model
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('pricing_model, tier, percentage_tier')
      .eq('user_id', req.userId)
      .single();

    // Create success URL with payment ID for redirect handling
    const successUrl = `${process.env.APP_URL || 'https://www.blinno.app'}/payment-success?paymentId=${payment.id}`;

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
      successUrl: successUrl,
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
 * Get all subscription tiers (public) - Both percentage-based and subscription-based
 */
router.get('/tiers', async (req, res) => {
  try {
    // Validate that tier constants are defined
    if (!PERCENTAGE_TIERS || typeof PERCENTAGE_TIERS !== 'object') {
      throw new Error('PERCENTAGE_TIERS is not defined');
    }
    if (!SUBSCRIPTION_TIERS || typeof SUBSCRIPTION_TIERS !== 'object') {
      throw new Error('SUBSCRIPTION_TIERS is not defined');
    }

    // Return both pricing models
    const percentageTiers: Record<string, any> = {};
    try {
      for (const [key, tier] of Object.entries(PERCENTAGE_TIERS)) {
        if (tier && typeof tier === 'object') {
          percentageTiers[key] = {
            ...tier,
            volumeRequirement: tier.volumeRequirement || null,
          };
        }
      }
    } catch (err: any) {
      console.error('Error processing percentage tiers:', err);
      throw new Error(`Failed to process percentage tiers: ${err.message}`);
    }

    const subscriptionTiers: Record<string, any> = {};
    try {
      for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
        if (tier && typeof tier === 'object') {
          subscriptionTiers[key] = { ...tier };
        }
      }
    } catch (err: any) {
      console.error('Error processing subscription tiers:', err);
      throw new Error(`Failed to process subscription tiers: ${err.message}`);
    }
    
    res.json({
      percentage: percentageTiers,
      subscription: subscriptionTiers,
    });
  } catch (error: any) {
    console.error('Get tiers error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get tiers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get user's volume stats for tier eligibility
 */
router.get('/volume', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const volume = await getUserMonthlyVolume(req.userId);
    
    // Check eligibility for each tier
    const eligibility = {
      basic: await checkTierEligibility(req.userId, 'basic'),
      premium: await checkTierEligibility(req.userId, 'premium'),
      pro: await checkTierEligibility(req.userId, 'pro'),
    };

    res.json({
      currentVolume: volume,
      eligibility,
      minimumFee: MINIMUM_PLATFORM_FEE,
    });
  } catch (error: any) {
    console.error('Get volume error:', error);
    res.status(500).json({ error: 'Failed to get volume stats' });
  }
});

/**
 * Check and automatically upgrade/downgrade user's tier based on volume
 * This should be called periodically (e.g., daily or after transactions)
 */
router.post('/check-tier-eligibility', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    const currentTier = subscription?.percentage_tier || 'basic';
    const volume = await getUserMonthlyVolume(req.userId);

    // Check which tier the user is eligible for (highest first)
    let eligibleTier: keyof typeof PERCENTAGE_TIERS = 'basic';
    
    if (await checkTierEligibility(req.userId, 'pro').then(r => r.eligible)) {
      eligibleTier = 'pro';
    } else if (await checkTierEligibility(req.userId, 'premium').then(r => r.eligible)) {
      eligibleTier = 'premium';
    }

    // If user is eligible for a higher tier, upgrade them
    // If user doesn't meet requirements for current tier, downgrade to basic
    const tierOrder = { basic: 1, premium: 2, pro: 3 };
    const shouldUpgrade = tierOrder[eligibleTier] > tierOrder[currentTier as keyof typeof tierOrder];
    const shouldDowngrade = tierOrder[eligibleTier] < tierOrder[currentTier as keyof typeof tierOrder];

    if (shouldUpgrade || shouldDowngrade) {
      const newTier = eligibleTier;
      const { data: updated, error: updateError } = await supabase
        .from('platform_subscriptions')
        .upsert({
          user_id: req.userId,
          tier: 'percentage',
          pricing_model: 'percentage',
          percentage_tier: newTier,
          monthly_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          status: 'active',
          payment_status: 'paid',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return res.json({
        message: shouldUpgrade ? 'Tier upgraded automatically' : 'Tier downgraded automatically',
        previousTier: currentTier,
        newTier: newTier,
        reason: shouldUpgrade 
          ? 'Volume requirements met for higher tier'
          : 'Volume requirements not met for current tier',
        currentVolume: volume,
        subscription: updated,
      });
    }

    res.json({
      message: 'Tier remains unchanged',
      currentTier,
      eligibleTier,
      currentVolume: volume,
    });
  } catch (error: any) {
    console.error('Check tier eligibility error:', error);
    res.status(500).json({ error: 'Failed to check tier eligibility', details: error.message });
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
