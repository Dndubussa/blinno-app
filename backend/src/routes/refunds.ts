import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';
import { financialTracking } from '../services/financialTracking.js';

const router = express.Router();

/**
 * Request a refund
 */
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId, reason, amount, items } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ error: 'Order ID and reason are required' });
    }

    // Get order details
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        order_id,
        products!inner(creator_id),
        orders!inner(id, user_id, total_amount, status, created_at)
      `)
      .eq('orders.id', orderId)
      .eq('orders.user_id', req.userId)
      .limit(1);

    if (!orderItems || orderItems.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = (orderItems[0] as any).orders;
    const creatorId = (orderItems[0] as any).products?.creator_id;

    // Check if order is eligible for refund
    if (!['delivered', 'paid', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        error: `Order with status '${order.status}' is not eligible for refund` 
      });
    }

    // Check refund policy
    const { data: policies } = await supabase
      .from('refund_policies')
      .select('*')
      .or(`creator_id.eq.${creatorId},policy_type.eq.platform`)
      .eq('is_active', true)
      .order('policy_type', { ascending: false })
      .limit(1);

    const policy = policies?.[0] || {
      refund_window_days: 7,
      return_window_days: 14,
      refund_percentage: 100,
    };

    // Check if within refund window
    const orderDate = new Date(order.created_at);
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceOrder > policy.refund_window_days) {
      return res.status(400).json({ 
        error: `Refund window has expired. Refunds must be requested within ${policy.refund_window_days} days.` 
      });
    }

    // Calculate refund amount
    const refundAmount = amount || parseFloat(order.total_amount);
    const maxRefund = (parseFloat(order.total_amount) * parseFloat(policy.refund_percentage.toString())) / 100;
    const finalAmount = Math.min(refundAmount, maxRefund);

    // Create refund request
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        user_id: req.userId,
        creator_id: creatorId,
        amount: finalAmount,
        currency: 'TZS',
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (refundError || !refund) {
      throw refundError;
    }

    // Create return requests if items specified
    if (items && items.length > 0) {
      for (const item of items) {
        await supabase
          .from('returns')
          .insert({
            order_id: orderId,
            order_item_id: item.orderItemId,
            user_id: req.userId,
            creator_id: creatorId,
            quantity: item.quantity,
            reason,
            status: 'pending',
            refund_id: refund.id,
          });
      }
    }

    // Notify seller
    await notificationService.createNotification(
      creatorId,
      'refund_requested',
      'Refund Requested',
      `A refund request has been submitted for order #${orderId}`,
      { refund_id: refund.id, order_id: orderId, amount: finalAmount }
    );

    res.status(201).json(refund);
  } catch (error: any) {
    console.error('Request refund error:', error);
    res.status(500).json({ error: 'Failed to request refund' });
  }
});

/**
 * Get user's refund requests
 */
router.get('/my-refunds', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        orders!inner(total_amount)
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((r: any) => ({
      ...r,
      order_total: r.orders?.total_amount,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get my refunds error:', error);
    res.status(500).json({ error: 'Failed to get refunds' });
  }
});

/**
 * Get refund requests for creator (seller)
 */
router.get('/creator-refunds', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        orders!inner(total_amount),
        buyer:profiles!refunds_user_id_fkey(display_name)
      `)
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((r: any) => ({
      ...r,
      order_total: r.orders?.total_amount,
      buyer_name: r.buyer?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get creator refunds error:', error);
    res.status(500).json({ error: 'Failed to get refunds' });
  }
});

/**
 * Approve refund (creator or admin)
 */
router.post('/:id/approve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Get refund
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (refundError || !refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Check authorization (creator or admin)
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;
    const isCreator = refund.creator_id === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    await supabase
      .from('refunds')
      .update({
        status: 'approved',
        admin_notes: notes || refund.admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Notify buyer
    await notificationService.createNotification(
      refund.user_id,
      'refund_approved',
      'Refund Approved',
      `Your refund request for order #${refund.order_id} has been approved.`,
      { refund_id: id, order_id: refund.order_id }
    );

    res.json({ message: 'Refund approved successfully' });
  } catch (error: any) {
    console.error('Approve refund error:', error);
    res.status(500).json({ error: 'Failed to approve refund' });
  }
});

/**
 * Process refund (admin only) - actually issue the refund
 */
router.post('/:id/process', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentReference, notes } = req.body;

    // Get refund
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (refundError || !refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    if (refund.status !== 'approved') {
      return res.status(400).json({ error: 'Refund must be approved before processing' });
    }

    // Update refund status
    await supabase
      .from('refunds')
      .update({
        status: 'processing',
        payment_reference: paymentReference || refund.payment_reference,
        admin_notes: notes || refund.admin_notes,
        processed_by: req.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // TODO: Integrate with payment gateway to process refund
    // For now, we'll mark it as processing and admin can manually complete it

    res.json({ message: 'Refund processing initiated' });
  } catch (error: any) {
    console.error('Process refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * Complete refund (admin only) - after refund is actually issued
 */
router.post('/:id/complete', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentReference, notes } = req.body;

    // Get refund
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (refundError || !refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    if (refund.status !== 'processing') {
      return res.status(400).json({ error: 'Refund must be in processing status' });
    }

    // Record refund transaction
    await financialTracking.recordTransaction(
      refund.creator_id,
      'refund',
      parseFloat(refund.amount.toString()),
      refund.id,
      'refund',
      `Refund for order #${refund.order_id}`,
      { order_id: refund.order_id, payment_reference: paymentReference }
    );

    // Update refund status
    await supabase
      .from('refunds')
      .update({
        status: 'completed',
        payment_reference: paymentReference || refund.payment_reference,
        admin_notes: notes || refund.admin_notes,
        processed_by: req.userId,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', refund.order_id);

    // Notify buyer
    await notificationService.createNotification(
      refund.user_id,
      'refund_completed',
      'Refund Completed',
      `Your refund of ${refund.amount} TZS has been processed.`,
      { refund_id: id, order_id: refund.order_id }
    );

    res.json({ message: 'Refund completed successfully' });
  } catch (error: any) {
    console.error('Complete refund error:', error);
    res.status(500).json({ error: 'Failed to complete refund' });
  }
});

/**
 * Reject refund (creator or admin)
 */
router.post('/:id/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get refund
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (refundError || !refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Check authorization
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;
    const isCreator = refund.creator_id === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    await supabase
      .from('refunds')
      .update({
        status: 'rejected',
        admin_notes: reason,
        processed_by: req.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Notify buyer
    await notificationService.createNotification(
      refund.user_id,
      'refund_rejected',
      'Refund Rejected',
      `Your refund request has been rejected: ${reason}`,
      { refund_id: id, order_id: refund.order_id }
    );

    res.json({ message: 'Refund rejected' });
  } catch (error: any) {
    console.error('Reject refund error:', error);
    res.status(500).json({ error: 'Failed to reject refund' });
  }
});

/**
 * Get refund policy
 */
router.get('/policy', async (req, res) => {
  try {
    const { creatorId } = req.query;

    let query = supabase
      .from('refund_policies')
      .select('*')
      .eq('is_active', true);

    if (creatorId) {
      query = query.or(`creator_id.eq.${creatorId},policy_type.eq.platform`)
        .order('policy_type', { ascending: false })
        .limit(1);
    } else {
      query = query.eq('policy_type', 'platform').limit(1);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'Refund policy not found' });
    }

    res.json(data[0]);
  } catch (error: any) {
    console.error('Get refund policy error:', error);
    res.status(500).json({ error: 'Failed to get refund policy' });
  }
});

export default router;
