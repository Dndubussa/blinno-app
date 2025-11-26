import express from 'express';
import { supabase } from '../config/supabase.js';
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

    let orderBy: { column: string; ascending: boolean } = { column: 'created_at', ascending: false };
    if (sort === 'rating_high') {
      // Need to sort by rating then date - will do in code
    } else if (sort === 'rating_low') {
      // Need to sort by rating then date - will do in code
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url),
        bookings(service_type, status)
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    // Sort by rating if needed
    let sortedReviews = reviews || [];
    if (sort === 'rating_high') {
      sortedReviews = sortedReviews.sort((a: any, b: any) => b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'rating_low') {
      sortedReviews = sortedReviews.sort((a: any, b: any) => a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Transform to match expected format
    const transformed = sortedReviews.map((r: any) => ({
      ...r,
      reviewer_name: r.reviewer?.display_name,
      reviewer_avatar: r.reviewer?.avatar_url,
      service_type: r.bookings?.service_type,
      booking_status: r.bookings?.status,
    }));

    // Get stats
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('creator_id', creatorId);

    const stats = {
      total_reviews: allReviews?.length || 0,
      average_rating: allReviews?.length ? (allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length).toFixed(2) : 0,
      five_star: allReviews?.filter((r: any) => r.rating === 5).length || 0,
      four_star: allReviews?.filter((r: any) => r.rating === 4).length || 0,
      three_star: allReviews?.filter((r: any) => r.rating === 3).length || 0,
      two_star: allReviews?.filter((r: any) => r.rating === 2).length || 0,
      one_star: allReviews?.filter((r: any) => r.rating === 1).length || 0,
    };

    res.json({
      reviews: transformed,
      stats,
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

    // Get orders with this product
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId);

    const orderIds = orderItems?.map((oi: any) => oi.order_id) || [];

    if (orderIds.length === 0) {
      return res.json([]);
    }

    // Get reviews for these orders
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)
      `)
      .in('booking_id', orderIds)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    const transformed = (reviews || []).map((r: any) => ({
      ...r,
      reviewer_name: r.reviewer?.display_name,
      reviewer_avatar: r.reviewer?.avatar_url,
    }));

    res.json(transformed);
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
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', req.userId)
        .eq('creator_id', creatorId)
        .eq('status', 'completed')
        .single();
      canReview = !!booking;
    } else if (productId) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_items!inner(product_id)')
        .eq('user_id', req.userId)
        .eq('status', 'delivered')
        .eq('order_items.product_id', productId);
      canReview = (orders?.length || 0) > 0;
    } else {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', req.userId)
        .eq('status', 'delivered')
        .limit(1);
      canReview = (orders?.length || 0) > 0;
    }

    if (!canReview) {
      return res.status(403).json({ 
        error: 'You can only review after completing a transaction with this creator' 
      });
    }

    // Check if review already exists
    if (bookingId) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', req.userId)
        .single();
      if (existing) {
        return res.status(400).json({ error: 'You have already reviewed this booking' });
      }
    }

    // Create review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        creator_id: creatorId,
        reviewer_id: req.userId,
        booking_id: bookingId || null,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Get average rating and count
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('creator_id', creatorId);

    const avgRating = allReviews?.length 
      ? allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length 
      : 0;

    // Update product rating if applicable
    if (productId) {
      await supabase
        .from('products')
        .update({
          rating: parseFloat(avgRating.toFixed(2)),
          reviews_count: allReviews?.length || 0,
        })
        .eq('id', productId);
    }

    // Get reviewer name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', req.userId)
      .single();

    const reviewerName = profile?.display_name || 'Someone';

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
    const { data: existing, error: checkError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .eq('reviewer_id', req.userId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (rating !== undefined) updates.rating = rating;
    if (comment !== undefined) updates.comment = comment;

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
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
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;

    // Check ownership or admin
    const { data: existing, error: checkError } = await supabase
      .from('reviews')
      .select('reviewer_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!isAdmin && existing.reviewer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

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
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        creator:profiles!reviews_creator_id_fkey(display_name, avatar_url)
      `)
      .eq('reviewer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const transformed = (reviews || []).map((r: any) => ({
      ...r,
      creator_name: r.creator?.display_name,
      creator_avatar: r.creator?.avatar_url,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;
