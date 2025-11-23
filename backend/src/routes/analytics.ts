import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get creator analytics
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.userId;

    // Revenue analytics
    const revenueResult = await pool.query(
      `SELECT 
        COALESCE(SUM(creator_payout), 0) as total_revenue,
        COUNT(*) as transaction_count
       FROM platform_fees
       WHERE user_id = $1 
         AND status = 'collected'
         ${startDate ? 'AND created_at >= $2' : ''}
         ${endDate ? `AND created_at <= $${startDate ? '3' : '2'}` : ''}`,
      startDate && endDate ? [userId, startDate, endDate] : startDate ? [userId, startDate] : [userId]
    );

    // Orders analytics
    const ordersResult = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.creator_id = $1
         ${startDate ? 'AND o.created_at >= $2' : ''}
         ${endDate ? `AND o.created_at <= $${startDate ? '3' : '2'}` : ''}`,
      startDate && endDate ? [userId, startDate, endDate] : startDate ? [userId, startDate] : [userId]
    );

    // Views analytics (would need a views tracking table)
    const viewsResult = await pool.query(
      `SELECT COUNT(*) as total_views
       FROM profiles
       WHERE user_id = $1`,
      [userId]
    );

    // Followers analytics
    const followersResult = await pool.query(
      `SELECT COUNT(*) as total_followers
       FROM user_follows
       WHERE following_id = $1`,
      [userId]
    );

    // Revenue trend (last 30 days by default)
    const trendResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(creator_payout) as revenue
       FROM platform_fees
       WHERE user_id = $1 
         AND status = 'collected'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      revenue: {
        total: parseFloat(revenueResult.rows[0]?.total_revenue || 0),
        transactionCount: parseInt(revenueResult.rows[0]?.transaction_count || 0),
      },
      orders: {
        total: parseInt(ordersResult.rows[0]?.total_orders || 0),
        completed: parseInt(ordersResult.rows[0]?.completed_orders || 0),
        cancelled: parseInt(ordersResult.rows[0]?.cancelled_orders || 0),
      },
      views: {
        total: parseInt(viewsResult.rows[0]?.total_views || 0),
      },
      followers: {
        total: parseInt(followersResult.rows[0]?.total_followers || 0),
      },
      revenueTrend: trendResult.rows.map((row) => ({
        date: row.date,
        value: parseFloat(row.revenue || 0),
      })),
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * Get product performance
 */
router.get('/products', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as total_sold,
        COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as total_revenue
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
       WHERE p.creator_id = $1
       GROUP BY p.id
       ORDER BY total_revenue DESC
       LIMIT 20`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get product performance error:', error);
    res.status(500).json({ error: 'Failed to get product performance' });
  }
});

export default router;

