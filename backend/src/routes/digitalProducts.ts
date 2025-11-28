import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { userPreferences } from '../services/userPreferences.js';

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
    
    let query = supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name, avatar_url)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId as string);
    }
    if (category) {
      query = query.eq('category', category as string);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((dp: any) => ({
      ...dp,
      display_name: dp.creator?.display_name,
      avatar_url: dp.creator?.avatar_url,
    }));

    res.json(transformed);
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
    
    const { data: product, error } = await supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    const transformed = {
      ...product,
      display_name: product.creator?.display_name,
      avatar_url: product.creator?.avatar_url,
    };

    res.json(transformed);
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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get digital product
    const { data: product, error: productError } = await supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    // Get creator email
    const { data: authUser } = await supabase.auth.admin.getUserById(product.creator_id);

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('digital_product_purchases')
      .select('*')
      .eq('product_id', id)
      .eq('buyer_id', req.userId)
      .eq('payment_status', 'paid')
      .single();

    if (existingPurchase) {
      return res.status(400).json({ error: 'You have already purchased this product' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateDigitalProductFee(parseFloat(product.price), undefined, undefined, currency);

    // Create purchase record (pending payment) with user's currency
    const { data: purchase, error: purchaseError } = await supabase
      .from('digital_product_purchases')
      .upsert({
        product_id: id,
        buyer_id: req.userId,
        amount_paid: feeCalculation.total,
        currency: currency,
        payment_status: 'pending',
      }, { onConflict: 'product_id,buyer_id' })
      .select()
      .single();

    if (purchaseError || !purchase) {
      throw purchaseError;
    }

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `digital_product_${id}_${req.userId}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'digital_product',
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
        transaction_id: `digital_product_${id}_${req.userId}`,
        transaction_type: 'digital_product',
        user_id: product.creator_id,
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
      orderId: `digital_product_${id}_${req.userId}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || product.creator?.display_name || 'Customer',
      description: `Purchase: ${product.title}`,
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
    console.error('Purchase digital product error:', error);
    res.status(500).json({ error: 'Failed to purchase digital product' });
  }
});

/**
 * Get purchased digital products for user
 */
router.get('/my/purchases', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_product_purchases')
      .select(`
        *,
        products:digital_products!inner(title, description, file_url, preview_url, category)
      `)
      .eq('buyer_id', req.userId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((dpp: any) => ({
      ...dpp,
      title: dpp.products?.title,
      description: dpp.products?.description,
      file_url: dpp.products?.file_url,
      preview_url: dpp.products?.preview_url,
      category: dpp.products?.category,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

export default router;
