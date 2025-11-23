import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get user's wishlists
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, COUNT(wi.id) as item_count
       FROM wishlists w
       LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get wishlists error:', error);
    res.status(500).json({ error: 'Failed to get wishlists' });
  }
});

/**
 * Create a wishlist
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, isPublic } = req.body;

    const result = await pool.query(
      `INSERT INTO wishlists (user_id, name, is_public)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, name || 'My Wishlist', isPublic || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create wishlist error:', error);
    res.status(500).json({ error: 'Failed to create wishlist' });
  }
});

/**
 * Add item to wishlist
 */
router.post('/:wishlistId/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId } = req.params;
    const { itemType, itemId, notes } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'Item type and ID are required' });
    }

    // Verify wishlist ownership
    const wishlistResult = await pool.query(
      'SELECT * FROM wishlists WHERE id = $1 AND user_id = $2',
      [wishlistId, req.userId]
    );

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const result = await pool.query(
      `INSERT INTO wishlist_items (wishlist_id, item_type, item_id, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wishlist_id, item_type, item_id) DO NOTHING
       RETURNING *`,
      [wishlistId, itemType, itemId, notes || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Item already in wishlist' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Add item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

/**
 * Remove item from wishlist
 */
router.delete('/:wishlistId/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId, itemId } = req.params;
    const { itemType } = req.query;

    if (!itemType) {
      return res.status(400).json({ error: 'Item type is required' });
    }

    // Verify wishlist ownership
    const wishlistResult = await pool.query(
      'SELECT * FROM wishlists WHERE id = $1 AND user_id = $2',
      [wishlistId, req.userId]
    );

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    await pool.query(
      'DELETE FROM wishlist_items WHERE wishlist_id = $1 AND item_type = $2 AND item_id = $3',
      [wishlistId, itemType, itemId]
    );

    res.json({ message: 'Item removed from wishlist' });
  } catch (error: any) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

/**
 * Get wishlist items
 */
router.get('/:wishlistId/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId } = req.params;

    // Verify wishlist ownership or public access
    const wishlistResult = await pool.query(
      'SELECT * FROM wishlists WHERE id = $1 AND (user_id = $2 OR is_public = true)',
      [wishlistId, req.userId]
    );

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const result = await pool.query(
      `SELECT 
        wi.*,
        CASE 
          WHEN wi.item_type = 'product' THEN (SELECT title FROM products WHERE id = wi.item_id)
          WHEN wi.item_type = 'portfolio' THEN (SELECT title FROM portfolios WHERE id = wi.item_id)
          WHEN wi.item_type = 'creator' THEN (SELECT display_name FROM profiles WHERE user_id = wi.item_id)
          ELSE NULL
        END as item_title,
        CASE 
          WHEN wi.item_type = 'product' THEN (SELECT image_url FROM products WHERE id = wi.item_id)
          WHEN wi.item_type = 'portfolio' THEN (SELECT image_url FROM portfolios WHERE id = wi.item_id)
          WHEN wi.item_type = 'creator' THEN (SELECT avatar_url FROM profiles WHERE user_id = wi.item_id)
          ELSE NULL
        END as item_image
       FROM wishlist_items wi
       WHERE wi.wishlist_id = $1
       ORDER BY wi.created_at DESC`,
      [wishlistId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get wishlist items error:', error);
    res.status(500).json({ error: 'Failed to get wishlist items' });
  }
});

/**
 * Check if item is in wishlist
 */
router.get('/check/:itemType/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { itemType, itemId } = req.params;

    const result = await pool.query(
      `SELECT w.id, w.name
       FROM wishlists w
       JOIN wishlist_items wi ON w.id = wi.wishlist_id
       WHERE w.user_id = $1 AND wi.item_type = $2 AND wi.item_id = $3
       LIMIT 1`,
      [req.userId, itemType, itemId]
    );

    res.json({ inWishlist: result.rows.length > 0, wishlist: result.rows[0] || null });
  } catch (error: any) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ error: 'Failed to check wishlist' });
  }
});

export default router;

