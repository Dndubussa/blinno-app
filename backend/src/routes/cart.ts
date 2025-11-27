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
          price,
          title,
          creator_id
        )
      `)
      .eq('user_id', req.userId);

    if (cartError) {
      throw cartError;
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate subtotal (products are stored in USD)
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.products?.price || 0) * item.quantity);
    }, 0);

    // Calculate platform fees using user's currency
    const feeCalculation = platformFees.calculateMarketplaceFee(subtotal, undefined, undefined, currency);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: req.userId,
        total_amount: feeCalculation.total,
        shipping_address: shippingAddress || {},
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError;
    }

    // Create order items and track creator IDs
    const creatorIds = new Set<string>();
    for (const item of cartItems) {
      await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.products?.price,
        });

      if (item.products?.creator_id) {
        creatorIds.add(item.products.creator_id);
      }
    }

    // Record platform fees for each creator
    for (const creatorId of creatorIds) {
      await supabase
        .from('platform_fees')
        .insert({
          transaction_id: order.id,
          transaction_type: 'marketplace',
          user_id: creatorId,
          buyer_id: req.userId,
          subtotal: subtotal,
          platform_fee: feeCalculation.platformFee,
          payment_processing_fee: feeCalculation.paymentProcessingFee,
          total_fees: feeCalculation.totalFees,
          creator_payout: feeCalculation.creatorPayout,
          status: 'pending',
        });
    }

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.userId);

    res.status(201).json({
      ...order,
      feeBreakdown: {
        subtotal: feeCalculation.subtotal,
        platformFee: feeCalculation.platformFee,
        paymentProcessingFee: feeCalculation.paymentProcessingFee,
        total: feeCalculation.total,
      },
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

export default router;
