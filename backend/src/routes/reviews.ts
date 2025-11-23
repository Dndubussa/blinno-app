import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Get reviews for a creator
 */
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { limit = 50, offset = 0, sort = 'recent' } = req.query;

    let orderBy = 'r.created_at DESC';
    if (sort === 'rating_high') orderBy = 'r.rating DESC, r.created_at DESC';
    if (sort === 'rating_low') orderBy = 'r.rating ASC, r.created_at DESC';

    const result = await pool.query(
      `SELECT 
        r.*,
        p.display_name as reviewer_name,
        p.avatar_url as reviewer_avatar,
        b.service_type,
        b.status as booking_status
       FROM reviews r
       JOIN profiles p ON r.reviewer_id = p.user_id
       LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.creator_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [creatorId, parseInt(limit as string), parseInt(offset as string)]
    );

    // Get average rating and count
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
       FROM reviews
       WHERE creator_id = $1`,
      [creatorId]
    );

    res.json({
      reviews: result.rows,
      stats: statsResult.rows[0],
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

/**
 * Get reviews for a product
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        r.*,
        p.display_name as reviewer_name,
        p.avatar_url as reviewer_avatar
       FROM reviews r
       JOIN profiles p ON r.reviewer_id = p.user_id
       JOIN orders o ON r.booking_id = o.id
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Failed to get product reviews' });
  }
});

/**
 * Submit a review
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { creatorId, bookingId, productId, rating, comment } = req.body;

    if (!creatorId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Creator ID and valid rating (1-5) are required' });
    }

    // Check if user has completed a booking/order with this creator
    let canReview = false;
    if (bookingId) {
      const bookingResult = await pool.query(
        `SELECT * FROM bookings 
         WHERE id = $1 AND user_id = $2 AND creator_id = $3 
         AND status = 'completed'`,
        [bookingId, req.userId, creatorId]
      );
      canReview = bookingResult.rows.length > 0;
    } else if (productId) {
      const orderResult = await pool.query(
        `SELECT o.* FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE oi.product_id = $1 AND o.user_id = $2 AND o.status = 'delivered'`,
        [productId, req.userId]
      );
      canReview = orderResult.rows.length > 0;
    } else {
      // Allow review if user has any completed transaction
      const transactionResult = await pool.query(
        `SELECT * FROM orders 
         WHERE user_id = $1 AND status = 'delivered'
         LIMIT 1`,
        [req.userId]
      );
      canReview = transactionResult.rows.length > 0;
    }

    if (!canReview) {
      return res.status(403).json({ 
        error: 'You can only review after completing a transaction with this creator' 
      });
    }

    // Check if review already exists
    if (bookingId) {
      const existingReview = await pool.query(
        'SELECT * FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
        [bookingId, req.userId]
      );
      if (existingReview.rows.length > 0) {
        return res.status(400).json({ error: 'You have already reviewed this booking' });
      }
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (creator_id, reviewer_id, booking_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [creatorId, req.userId, bookingId || null, rating, comment || null]
    );

    // Update creator's average rating (could be done via trigger, but doing it here for now)
    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE creator_id = $1`,
      [creatorId]
    );

    // Update product rating if applicable
    if (productId) {
      await pool.query(
        `UPDATE products 
         SET rating = $1, reviews_count = $2
         WHERE id = $3`,
        [
          parseFloat(avgResult.rows[0].avg_rating || 0),
          parseInt(avgResult.rows[0].count || 0),
          productId,
        ]
      );
    }

    const review = result.rows[0];

    // Get reviewer name
    const reviewerResult = await pool.query(
      `SELECT display_name FROM profiles WHERE user_id = $1`,
      [req.userId]
    );
    const reviewerName = reviewerResult.rows[0]?.display_name || 'Someone';

    // Notify creator about new review
    await notificationService.notifyReview(
      creatorId,
      review.id,
      rating,
      reviewerName
    );

    res.status(201).json(review);
  } catch (error: any) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

/**
 * Update a review (only by reviewer)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check ownership
    const reviewResult = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND reviewer_id = $2',
      [id, req.userId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }

    const result = await pool.query(
      `UPDATE reviews
       SET rating = COALESCE($1, rating),
           comment = COALESCE($2, comment),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [rating, comment, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * Delete a review (only by reviewer or admin)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;

    // Check ownership or admin
    const reviewResult = await pool.query(
      'SELECT * FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!isAdmin && reviewResult.rows[0].reviewer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

/**
 * Get user's reviews (reviews they've written)
 */
router.get('/my-reviews', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        p.display_name as creator_name,
        p.avatar_url as creator_avatar
       FROM reviews r
       JOIN profiles p ON r.creator_id = p.user_id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;

