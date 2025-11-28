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
 * Get commissions for creator
 */
router.get('/my-commissions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: commissions, error } = await supabase
      .from('commissions')
      .select(`
        *,
        client:profiles!commissions_client_id_fkey(display_name),
        client_user:users!commissions_client_id_fkey(email)
      `)
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (commissions || []).map((c: any) => ({
      ...c,
      client_name: c.client_id ? c.client?.display_name : null,
      client_email: c.client_id ? c.client_user?.email : null,
    }));

    res.json(transformed);
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
    const { data: commissions, error } = await supabase
      .from('commissions')
      .select(`
        *,
        creator:profiles!commissions_creator_id_fkey(display_name)
      `)
      .eq('client_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const transformed = (commissions || []).map((c: any) => ({
      ...c,
      creator_name: c.creator?.display_name,
    }));

    res.json(transformed);
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

    const { data, error } = await supabase
      .from('commissions')
      .insert({
        creator_id: creatorId,
        client_id: req.userId,
        title,
        description: description || null,
        budget: parseFloat(budget),
        deadline: deadline || null,
        requirements: requirements || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
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
    const { data: existing, error: checkError } = await supabase
      .from('commissions')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('commissions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get commission details
    const { data: commission, error: commissionError } = await supabase
      .from('commissions')
      .select(`
        *,
        client:profiles!commissions_client_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('client_id', req.userId)
      .single();

    if (commissionError || !commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    // Get client email
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);

    if (commission.status !== 'completed') {
      return res.status(400).json({ error: 'Commission must be completed before payment' });
    }

    if (commission.payment_status === 'paid') {
      return res.status(400).json({ error: 'Commission already paid' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateCommissionFee(parseFloat(commission.budget.toString()), undefined, undefined, currency);

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `commission_${id}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'commission',
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
        transaction_id: `commission_${id}`,
        transaction_type: 'commission',
        user_id: commission.creator_id,
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
      orderId: `commission_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || commission.client?.display_name || 'Customer',
      description: `Payment for commission: ${commission.title}`,
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
