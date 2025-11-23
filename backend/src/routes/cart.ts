import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { platformFees } from '../services/platformFees.js';

const router = express.Router();

// Get cart items
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.*, p.title, p.price, p.image_url, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
    const existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.userId, productId]
    );

    if (existing.rows.length > 0) {
      // Update quantity
      const result = await pool.query(
        `UPDATE cart_items
         SET quantity = quantity + $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [parseInt(quantity), existing.rows[0].id]
      );
      return res.json(result.rows[0]);
    }

    // Create new cart item
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, productId, parseInt(quantity)]
    );

    res.status(201).json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT user_id FROM cart_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE cart_items
       SET quantity = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [parseInt(quantity), id]
    );

    res.json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT user_id FROM cart_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);

    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.userId]);
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

    // Get cart items
    const cartResult = await pool.query(
      `SELECT ci.*, p.price, p.title
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate subtotal
    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Calculate platform fees
    const feeCalculation = platformFees.calculateMarketplaceFee(subtotal);

    // Create order with fee breakdown
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, notes, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [req.userId, feeCalculation.total, JSON.stringify(shippingAddress || {}), notes || null]
    );

    const order = orderResult.rows[0];

    // Store fee breakdown in order metadata (or create separate fee record)
    await pool.query(
      `UPDATE orders 
       SET notes = COALESCE(notes, '') || ' | Fees: Platform=' || $1 || ', Processing=' || $2
       WHERE id = $3`,
      [feeCalculation.platformFee.toString(), feeCalculation.paymentProcessingFee.toString(), order.id]
    );

    // Create order items and get creator IDs for fee tracking
    const creatorIds = new Set<string>();
    for (const item of cartResult.rows) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );
      
      // Get product creator for fee tracking
      const productResult = await pool.query(
        'SELECT creator_id FROM products WHERE id = $1',
        [item.product_id]
      );
      if (productResult.rows[0]?.creator_id) {
        creatorIds.add(productResult.rows[0].creator_id);
      }
    }

    // Record platform fee (will be collected when payment completes)
    for (const creatorId of creatorIds) {
      await pool.query(
        `INSERT INTO platform_fees (
          transaction_id, transaction_type, user_id, buyer_id,
          subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [
          order.id,
          'marketplace',
          creatorId,
          req.userId,
          subtotal,
          feeCalculation.platformFee,
          feeCalculation.paymentProcessingFee,
          feeCalculation.totalFees,
          feeCalculation.creatorPayout,
        ]
      );
    }

    // Clear cart
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.userId]);

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

