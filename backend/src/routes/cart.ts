import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { platformFees } from '../services/platformFees.js';
import { userPreferences } from '../services/userPreferences.js';

const router = express.Router();

// Get cart items
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get cart items with product details
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          title,
          price,
          image_url,
          stock_quantity
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (cartError) {
      throw cartError;
    }

    // Transform data to match expected format
    const result = (cartItems || []).map((item: any) => ({
      ...item,
      title: item.products?.title,
      price: item.products?.price,
      image_url: item.products?.image_url,
      stock_quantity: item.products?.stock_quantity,
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

// Add to cart
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if item already exists
    const { data: existing, error: existingError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', req.userId)
      .eq('product_id', productId)
      .single();

    if (existing && !existingError) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({
          quantity: existing.quantity + parseInt(quantity),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json(data);
    }

    // Create new cart item
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: req.userId,
        product_id: productId,
        quantity: parseInt(quantity),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('cart_items')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity: parseInt(quantity),
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
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove from cart
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('cart_items')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.userId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Cart cleared' });
  } catch (error: any) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Create order from cart
router.post('/checkout', authenticate, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, notes } = req.body;

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get cart items with product details
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          price,
          title,
          creator_id,
          stock_quantity,
          is_active
        )
      `)
      .eq('user_id', req.userId);

    if (cartError) {
      throw cartError;
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate products exist, are active, and have stock
    const validationErrors: string[] = [];
    for (const item of cartItems) {
      if (!item.products) {
        validationErrors.push(`Product ${item.product_id} not found`);
        continue;
      }
      
      if (!item.products.is_active) {
        validationErrors.push(`Product "${item.products.title}" is no longer available`);
        continue;
      }

      if (item.products.stock_quantity !== null && item.quantity > item.products.stock_quantity) {
        validationErrors.push(`Insufficient stock for "${item.products.title}". Available: ${item.products.stock_quantity}, Requested: ${item.quantity}`);
        continue;
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Cart validation failed', 
        details: validationErrors 
      });
    }

    // Group items by creator and calculate subtotals per creator
    const creatorItems = new Map<string, Array<{ item: any; subtotal: number }>>();
    let totalSubtotal = 0;

    for (const item of cartItems) {
      if (!item.products?.creator_id) continue;
      
      const creatorId = item.products.creator_id;
      const itemSubtotal = parseFloat(item.products.price || 0) * item.quantity;
      totalSubtotal += itemSubtotal;

      if (!creatorItems.has(creatorId)) {
        creatorItems.set(creatorId, []);
      }
      creatorItems.get(creatorId)!.push({ item, subtotal: itemSubtotal });
    }

    // Get creator subscription tiers for fee calculation
    const creatorTiers = new Map<string, { percentageTier?: string; subscriptionTier?: string }>();
    for (const creatorId of creatorItems.keys()) {
      const { data: subscription } = await supabase
        .from('platform_subscriptions')
        .select('pricing_model, percentage_tier, tier')
        .eq('user_id', creatorId)
        .eq('status', 'active')
        .single();

      if (subscription) {
        creatorTiers.set(creatorId, {
          percentageTier: subscription.pricing_model === 'percentage' ? subscription.percentage_tier : undefined,
          subscriptionTier: subscription.pricing_model === 'subscription' ? subscription.tier : undefined,
        });
      }
    }

    // Calculate fees per creator
    let totalPlatformFee = 0;
    let totalPaymentProcessingFee = 0;
    const creatorFees = new Map<string, any>();

    for (const [creatorId, items] of creatorItems.entries()) {
      const creatorSubtotal = items.reduce((sum, { subtotal }) => sum + subtotal, 0);
      const tier = creatorTiers.get(creatorId);
      
      const feeCalculation = platformFees.calculateMarketplaceFee(
        creatorSubtotal,
        tier?.percentageTier as any,
        tier?.subscriptionTier as any,
        currency
      );

      totalPlatformFee += feeCalculation.platformFee;
      totalPaymentProcessingFee += feeCalculation.paymentProcessingFee;

      creatorFees.set(creatorId, {
        ...feeCalculation,
        creatorSubtotal,
      });
    }

    // Calculate total order amount (subtotal + payment processing fee)
    // Payment processing fee is calculated on the total subtotal, not per creator
    const totalPaymentProcessingFeeCalculation = platformFees.calculateMarketplaceFee(
      totalSubtotal,
      undefined,
      undefined,
      currency
    );
    const orderTotal = totalSubtotal + totalPaymentProcessingFeeCalculation.paymentProcessingFee;

    // Create order with currency
    // Note: Run migration add_currency_to_orders.sql if currency column doesn't exist
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: req.userId,
        total_amount: orderTotal,
        currency: currency,
        shipping_address: shippingAddress || {},
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError;
    }

    // Create order items and track errors
    const orderItemErrors: string[] = [];
    for (const item of cartItems) {
      if (!item.products) continue;

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.products.price,
        });

      if (itemError) {
        orderItemErrors.push(`Failed to create order item for product ${item.product_id}: ${itemError.message}`);
      }
    }

    // If order items creation failed, delete order and return error
    if (orderItemErrors.length > 0) {
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ 
        error: 'Failed to create order items', 
        details: orderItemErrors 
      });
    }

    // Record platform fees for each creator with their specific calculations
    const feeErrors: string[] = [];
    for (const [creatorId, feeData] of creatorFees.entries()) {
      // Calculate payment processing fee proportion for this creator
      const paymentProcessingFeeProportion = (feeData.creatorSubtotal / totalSubtotal) * totalPaymentProcessingFeeCalculation.paymentProcessingFee;

      const { error: feeError } = await supabase
        .from('platform_fees')
        .insert({
          transaction_id: order.id,
          transaction_type: 'marketplace',
          user_id: creatorId,
          buyer_id: req.userId,
          subtotal: feeData.creatorSubtotal,
          platform_fee: feeData.platformFee,
          payment_processing_fee: paymentProcessingFeeProportion,
          total_fees: feeData.platformFee + paymentProcessingFeeProportion,
          creator_payout: feeData.creatorPayout,
          status: 'pending',
        });

      if (feeError) {
        feeErrors.push(`Failed to record fees for creator ${creatorId}: ${feeError.message}`);
      }
    }

    // If fee recording failed, log but don't fail the order (fees can be recalculated)
    if (feeErrors.length > 0) {
      console.error('Fee recording errors:', feeErrors);
    }

    // Clear cart only after successful order creation
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.userId);

    res.status(201).json({
      ...order,
      feeBreakdown: {
        subtotal: totalSubtotal,
        platformFee: totalPlatformFee,
        paymentProcessingFee: totalPaymentProcessingFeeCalculation.paymentProcessingFee,
        total: orderTotal,
      },
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed', details: error.message });
  }
});

export default router;

