import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Get user's orders
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price_at_purchase,
          products (
            title,
            image_url
          )
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (orders || []).map((order: any) => ({
      ...order,
      items: (order.order_items || []).map((oi: any) => ({
        id: oi.id,
        product_id: oi.product_id,
        quantity: oi.quantity,
        price_at_purchase: oi.price_at_purchase,
        product_title: oi.products?.title,
        product_image: oi.products?.image_url,
      })),
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

/**
 * Get order details with tracking
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price_at_purchase,
          products (
            title,
            image_url
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get status history
    const { data: history } = await supabase
      .from('order_status_history')
      .select(`
        *,
        changed_by:profiles!order_status_history_changed_by_fkey(display_name)
      `)
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    // Get payment info
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Transform order items
    const items = (order.order_items || []).map((oi: any) => ({
      id: oi.id,
      product_id: oi.product_id,
      quantity: oi.quantity,
      price_at_purchase: oi.price_at_purchase,
      product_title: oi.products?.title,
      product_image: oi.products?.image_url,
    }));

    // Transform status history
    const statusHistory = (history || []).map((h: any) => ({
      ...h,
      changed_by_name: h.changed_by?.display_name,
    }));

    res.json({
      ...order,
      items,
      statusHistory,
      payment: payments?.[0] || null,
    });
  } catch (error: any) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

/**
 * Update order status (seller/admin)
 */
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, shippingCarrier, estimatedDeliveryDate, notes } = req.body;

    // Get order to check ownership
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        order_id,
        products!inner(creator_id)
      `)
      .eq('order_id', id)
      .limit(1);

    if (!orderItems || orderItems.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const creatorId = (orderItems[0] as any).products?.creator_id;

    // Check if user is admin or product creator
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;
    const isCreator = creatorId === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update order status (using RPC function if available, otherwise direct update)
    // For now, we'll update directly and create history entry
    await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    // Create status history entry
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status,
        changed_by: req.userId,
        notes: notes || null,
      });

    // Update tracking info if provided
    if (trackingNumber || shippingCarrier || estimatedDeliveryDate) {
      const trackingUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (trackingNumber) trackingUpdates.tracking_number = trackingNumber;
      if (shippingCarrier) trackingUpdates.shipping_carrier = shippingCarrier;
      if (estimatedDeliveryDate) trackingUpdates.estimated_delivery_date = estimatedDeliveryDate;

      await supabase
        .from('orders')
        .update(trackingUpdates)
        .eq('id', id);
    }

    // Get order user_id for notification
    const { data: order } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', id)
      .single();

    // Notify buyer about status change
    if (order) {
      await notificationService.notifyOrderStatus(order.user_id, id, status);
    }

    // Get updated order
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * Cancel order (buyer)
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow cancellation if order is pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Create status history entry
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status: 'cancelled',
        changed_by: req.userId,
        notes: reason || 'Cancelled by buyer',
      });

    // Get seller IDs from order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        products!inner(creator_id)
      `)
      .eq('order_id', id);

    const sellerIds = new Set<string>();
    (orderItems || []).forEach((oi: any) => {
      if (oi.products?.creator_id) {
        sellerIds.add(oi.products.creator_id);
      }
    });

    // Notify sellers
    for (const sellerId of sellerIds) {
      await notificationService.createNotification(
        sellerId,
        'order_cancelled',
        'Order Cancelled',
        `Order #${id} has been cancelled by the buyer.`,
        { order_id: id, reason }
      );
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

/**
 * Confirm delivery (buyer)
 */
router.post('/:id/confirm-delivery', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({ 
        error: 'Order must be shipped before confirming delivery' 
      });
    }

    // Update order status
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Create status history entry
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status: 'delivered',
        changed_by: req.userId,
        notes: 'Confirmed by buyer',
      });

    res.json({ message: 'Delivery confirmed successfully' });
  } catch (error: any) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Failed to confirm delivery' });
  }
});

/**
 * Get shipping addresses
 */
router.get('/shipping-addresses', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', req.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get shipping addresses error:', error);
    res.status(500).json({ error: 'Failed to get shipping addresses' });
  }
});

/**
 * Create shipping address
 */
router.post('/shipping-addresses', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      label,
      recipient_name,
      phone,
      street,
      city,
      region,
      postal_code,
      country,
      is_default,
    } = req.body;

    if (!recipient_name || !phone || !street || !city) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', req.userId);
    }

    const { data, error } = await supabase
      .from('shipping_addresses')
      .insert({
        user_id: req.userId,
        label: label || null,
        recipient_name,
        phone,
        street,
        city,
        region: region || null,
        postal_code: postal_code || null,
        country: country || 'Global',
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create shipping address error:', error);
    res.status(500).json({ error: 'Failed to create shipping address' });
  }
});

export default router;
