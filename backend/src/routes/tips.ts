import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Verify creator exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', creatorId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Get creator email
    const { data: authUser } = await supabase.auth.admin.getUserById(creatorId);

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateTipFee(parseFloat(amount), currency);

    // Create tip record (pending payment) with user's currency
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        creator_id: creatorId,
        sender_id: isAnonymous ? null : req.userId,
        amount: feeCalculation.total,
        currency: currency,
        message: message || null,
        is_anonymous: isAnonymous || false,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (tipError || !tip) {
      throw tipError;
    }

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `tip_${tip.id}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'tip',
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
        transaction_id: `tip_${tip.id}`,
        transaction_type: 'tip',
        user_id: creatorId,
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
      orderId: `tip_${tip.id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || (isAnonymous ? 'Anonymous' : 'Supporter'),
      description: `Tip to ${profile.display_name || 'Creator'}`,
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

      await supabase
        .from('tips')
        .update({ payment_status: 'failed' })
        .eq('id', tip.id);

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
    const { data: tips, error } = await supabase
      .from('tips')
      .select(`
        *,
        sender:profiles!tips_sender_id_fkey(display_name),
        sender_user:users!tips_sender_id_fkey(email)
      `)
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (tips || []).map((t: any) => ({
      ...t,
      sender_name: t.is_anonymous ? null : t.sender?.display_name,
      sender_email: t.is_anonymous ? null : t.sender_user?.email,
    }));

    res.json(transformed);
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
    const { data: tips, error } = await supabase
      .from('tips')
      .select(`
        *,
        creator:profiles!tips_creator_id_fkey(display_name)
      `)
      .eq('sender_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const transformed = (tips || []).map((t: any) => ({
      ...t,
      creator_name: t.creator?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get sent tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

export default router;
