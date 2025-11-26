import express from 'express';
import { supabase } from '../config/supabase.js';
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
    let revenueQuery = supabase
      .from('platform_fees')
      .select('creator_payout', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'collected');

    if (startDate) {
      revenueQuery = revenueQuery.gte('created_at', startDate as string);
    }
    if (endDate) {
      revenueQuery = revenueQuery.lte('created_at', endDate as string);
    }

    const { data: revenueData, error: revenueError } = await revenueQuery;

    if (revenueError) {
      throw revenueError;
    }

    const totalRevenue = (revenueData || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout) || 0), 0
    );

    // Orders analytics
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        order_items!inner(
          products!inner(creator_id)
        )
      `)
      .eq('order_items.products.creator_id', userId);

    if (ordersError) {
      throw ordersError;
    }

    const orders = ordersData || [];
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o: any) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;

    // Views analytics (would need a views tracking table)
    const { data: profile } = await supabase
      .from('profiles')
      .select('view_count')
      .eq('user_id', userId)
      .single();

    // Followers analytics
    const { count: followersCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Revenue trend (last 30 days by default)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trendData, error: trendError } = await supabase
      .from('platform_fees')
      .select('created_at, creator_payout')
      .eq('user_id', userId)
      .eq('status', 'collected')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (trendError) {
      throw trendError;
    }

    // Group by date
    const trendMap = new Map<string, number>();
    (trendData || []).forEach((fee: any) => {
      const date = new Date(fee.created_at).toISOString().split('T')[0];
      const current = trendMap.get(date) || 0;
      trendMap.set(date, current + (parseFloat(fee.creator_payout) || 0));
    });

    const revenueTrend = Array.from(trendMap.entries()).map(([date, revenue]) => ({
      date,
      value: revenue,
    }));

    res.json({
      revenue: {
        total: totalRevenue,
        transactionCount: revenueData?.length || 0,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      views: {
        total: profile?.view_count || 0,
      },
      followers: {
        total: followersCount || 0,
      },
      revenueTrend,
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
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        order_items!inner(
          order_id,
          quantity,
          price_at_purchase,
          orders!inner(status)
        )
      `)
      .eq('creator_id', req.userId);

    if (error) {
      throw error;
    }

    // Transform and calculate metrics
    const transformed = (products || []).map((p: any) => {
      const deliveredOrders = (p.order_items || []).filter((oi: any) => 
        oi.orders?.status === 'delivered'
      );
      const orderCount = new Set(deliveredOrders.map((oi: any) => oi.order_id)).size;
      const totalSold = deliveredOrders.reduce((sum: number, oi: any) => 
        sum + (parseInt(oi.quantity) || 0), 0
      );
      const totalRevenue = deliveredOrders.reduce((sum: number, oi: any) => 
        sum + (parseFloat(oi.price_at_purchase) * parseInt(oi.quantity) || 0), 0
      );

      return {
        ...p,
        order_count: orderCount,
        total_sold: totalSold,
        total_revenue: totalRevenue,
      };
    }).sort((a: any, b: any) => b.total_revenue - a.total_revenue).slice(0, 20);

    res.json(transformed);
  } catch (error: any) {
    console.error('Get product performance error:', error);
    res.status(500).json({ error: 'Failed to get product performance' });
  }
});

export default router;
