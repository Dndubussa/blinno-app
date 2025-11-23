import express from 'express';
import { pool } from '../config/database.js';
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
    const orderResult = await pool.query(
      `SELECT o.*, p.creator_id
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND o.user_id = $2
       LIMIT 1`,
      [orderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if order is eligible for refund
    if (!['delivered', 'paid', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        error: `Order with status '${order.status}' is not eligible for refund` 
      });
    }

    // Check refund policy
    const policyResult = await pool.query(
      `SELECT * FROM refund_policies 
       WHERE (creator_id = $1 OR policy_type = 'platform') 
       AND is_active = true
       ORDER BY policy_type DESC
       LIMIT 1`,
      [order.creator_id]
    );

    const policy = policyResult.rows[0] || {
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
    const maxRefund = (parseFloat(order.total_amount) * parseFloat(policy.refund_percentage)) / 100;
    const finalAmount = Math.min(refundAmount, maxRefund);

    // Create refund request
    const refundResult = await pool.query(
      `INSERT INTO refunds (
        order_id, user_id, creator_id, amount, currency, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`,
      [
        orderId,
        req.userId,
        order.creator_id,
        finalAmount,
        'TZS',
        reason,
      ]
    );

    const refund = refundResult.rows[0];

    // Create return requests if items specified
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO returns (
            order_id, order_item_id, user_id, creator_id, quantity, reason, status, refund_id
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
          [
            orderId,
            item.orderItemId,
            req.userId,
            order.creator_id,
            item.quantity,
            reason,
            refund.id,
          ]
        );
      }
    }

    // Notify seller
    await notificationService.createNotification(
      order.creator_id,
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
    const result = await pool.query(
      `SELECT r.*, o.total_amount as order_total
       FROM refunds r
       JOIN orders o ON r.order_id = o.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
    const result = await pool.query(
      `SELECT r.*, o.total_amount as order_total, p.display_name as buyer_name
       FROM refunds r
       JOIN orders o ON r.order_id = o.id
       JOIN profiles p ON r.user_id = p.user_id
       WHERE r.creator_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
    const refundResult = await pool.query(
      'SELECT * FROM refunds WHERE id = $1',
      [id]
    );

    if (refundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    const refund = refundResult.rows[0];

    // Check authorization (creator or admin)
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;
    const isCreator = refund.creator_id === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    await pool.query(
      `UPDATE refunds
       SET status = 'approved',
           admin_notes = COALESCE($1, admin_notes),
           updated_at = now()
       WHERE id = $2`,
      [notes || null, id]
    );

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
    const refundResult = await pool.query(
      'SELECT * FROM refunds WHERE id = $1',
      [id]
    );

    if (refundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    const refund = refundResult.rows[0];

    if (refund.status !== 'approved') {
      return res.status(400).json({ error: 'Refund must be approved before processing' });
    }

    // Update refund status
    await pool.query(
      `UPDATE refunds
       SET status = 'processing',
           payment_reference = COALESCE($1, payment_reference),
           admin_notes = COALESCE($2, admin_notes),
           processed_by = $3,
           updated_at = now()
       WHERE id = $4`,
      [paymentReference || null, notes || null, req.userId, id]
    );

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
    const refundResult = await pool.query(
      'SELECT * FROM refunds WHERE id = $1',
      [id]
    );

    if (refundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    const refund = refundResult.rows[0];

    if (refund.status !== 'processing') {
      return res.status(400).json({ error: 'Refund must be in processing status' });
    }

    // Record refund transaction
    await financialTracking.recordTransaction(
      refund.creator_id,
      'refund',
      parseFloat(refund.amount),
      refund.id,
      'refund',
      `Refund for order #${refund.order_id}`,
      { order_id: refund.order_id, payment_reference: paymentReference }
    );

    // Update refund status
    await pool.query(
      `UPDATE refunds
       SET status = 'completed',
           payment_reference = COALESCE($1, payment_reference),
           admin_notes = COALESCE($2, admin_notes),
           processed_by = $3,
           processed_at = now(),
           updated_at = now()
       WHERE id = $4`,
      [paymentReference || null, notes || null, req.userId, id]
    );

    // Update order status
    await pool.query(
      `UPDATE orders SET status = 'refunded' WHERE id = $1`,
      [refund.order_id]
    );

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
    const refundResult = await pool.query(
      'SELECT * FROM refunds WHERE id = $1',
      [id]
    );

    if (refundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    const refund = refundResult.rows[0];

    // Check authorization
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;
    const isCreator = refund.creator_id === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    await pool.query(
      `UPDATE refunds
       SET status = 'rejected',
           admin_notes = $1,
           processed_by = $2,
           updated_at = now()
       WHERE id = $3`,
      [reason, req.userId, id]
    );

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

    let query = `
      SELECT * FROM refund_policies
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (creatorId) {
      query += ` AND (creator_id = $${paramCount++} OR policy_type = 'platform')`;
      params.push(creatorId);
      query += ` ORDER BY policy_type DESC LIMIT 1`;
    } else {
      query += ` AND policy_type = 'platform' LIMIT 1`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Refund policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get refund policy error:', error);
    res.status(500).json({ error: 'Failed to get refund policy' });
  }
});

export default router;

