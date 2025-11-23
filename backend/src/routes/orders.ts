import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Get user's orders
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price_at_purchase', oi.price_at_purchase,
            'product_title', p.title,
            'product_image', p.image_url
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
    `;
    const params: any[] = [req.userId];
    let paramCount = 2;

    if (status) {
      query += ` AND o.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    res.json(result.rows);
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

    // Get order
    const orderResult = await pool.query(
      `SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price_at_purchase', oi.price_at_purchase,
            'product_title', p.title,
            'product_image', p.image_url
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get status history
    const historyResult = await pool.query(
      `SELECT 
        osh.*,
        p.display_name as changed_by_name
       FROM order_status_history osh
       LEFT JOIN profiles p ON osh.changed_by = p.user_id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at ASC`,
      [id]
    );

    // Get payment info
    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    res.json({
      ...order,
      statusHistory: historyResult.rows,
      payment: paymentResult.rows[0] || null,
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
    const orderResult = await pool.query(
      `SELECT o.*, p.creator_id 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       LIMIT 1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if user is admin or product creator
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;
    const isCreator = order.creator_id === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update order status
    await pool.query(
      `SELECT update_order_status($1::uuid, $2::text, $3::uuid, $4::text)`,
      [id, status, req.userId, notes || null]
    );

    // Update tracking info if provided
    if (trackingNumber || shippingCarrier || estimatedDeliveryDate) {
      await pool.query(
        `UPDATE orders
         SET tracking_number = COALESCE($1, tracking_number),
             shipping_carrier = COALESCE($2, shipping_carrier),
             estimated_delivery_date = COALESCE($3, estimated_delivery_date),
             updated_at = now()
         WHERE id = $4`,
        [trackingNumber || null, shippingCarrier || null, estimatedDeliveryDate || null, id]
      );
    }

    // Notify buyer about status change
    await notificationService.notifyOrderStatus(order.user_id, id, status);

    // Get updated order
    const updatedResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    res.json(updatedResult.rows[0]);
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
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only allow cancellation if order is pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }

    // Update order status
    await pool.query(
      `SELECT update_order_status($1::uuid, $2::text, $3::uuid, $4::text)`,
      [id, 'cancelled', req.userId, reason || 'Cancelled by buyer']
    );

    // Notify seller
    const sellerResult = await pool.query(
      `SELECT DISTINCT p.creator_id 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    for (const seller of sellerResult.rows) {
      await notificationService.createNotification(
        seller.creator_id,
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
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'shipped') {
      return res.status(400).json({ 
        error: 'Order must be shipped before confirming delivery' 
      });
    }

    // Update order status
    await pool.query(
      `SELECT update_order_status($1::uuid, $2::text, $3::uuid, $4::text)`,
      [id, 'delivered', req.userId, 'Confirmed by buyer']
    );

    // Update delivered_at
    await pool.query(
      `UPDATE orders SET delivered_at = now() WHERE id = $1`,
      [id]
    );

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
    const result = await pool.query(
      `SELECT * FROM shipping_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
      await pool.query(
        `UPDATE shipping_addresses SET is_default = false WHERE user_id = $1`,
        [req.userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO shipping_addresses (
        user_id, label, recipient_name, phone, street, city, region, postal_code, country, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.userId,
        label || null,
        recipient_name,
        phone,
        street,
        city,
        region || null,
        postal_code || null,
        country || 'Tanzania',
        is_default || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create shipping address error:', error);
    res.status(500).json({ error: 'Failed to create shipping address' });
  }
});

export default router;

