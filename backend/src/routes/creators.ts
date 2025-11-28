import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Get featured creators
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get creators with featured portfolios or high ratings
    const { data: creators, error } = await supabase
      .from('profiles')
      .select(`
        *,
        portfolios:portfolios!inner(
          id,
          title,
          category,
          image_url,
          is_featured
        ),
        user_roles:user_roles(role)
      `)
      .eq('is_creator', true)
      .eq('portfolios.is_featured', true)
      .limit(Number(limit));

    if (error) {
      throw error;
    }

    // Get ratings and reviews count
    const creatorIds = (creators || []).map((c: any) => c.user_id);
    
    const { data: reviews } = await supabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', creatorIds);

    // Calculate ratings for each creator
    const ratingsMap: Record<string, { rating: number; count: number }> = {};
    reviews?.forEach((review: any) => {
      if (!ratingsMap[review.reviewee_id]) {
        ratingsMap[review.reviewee_id] = { rating: 0, count: 0 };
      }
      ratingsMap[review.reviewee_id].rating += review.rating;
      ratingsMap[review.reviewee_id].count += 1;
    });

    // Transform data
    const featured = (creators || []).map((creator: any) => {
      const stats = ratingsMap[creator.user_id] || { rating: 0, count: 0 };
      const avgRating = stats.count > 0 ? stats.rating / stats.count : 0;
      
      return {
        id: creator.user_id,
        name: creator.display_name,
        category: creator.portfolios?.[0]?.category || 'Creator',
        location: creator.location,
        avatar_url: creator.avatar_url,
        bio: creator.bio,
        rating: Math.round(avgRating * 10) / 10,
        reviews_count: stats.count,
        followers: 0, // Could be calculated from follows table if exists
        verified: creator.user_roles?.some((r: any) => r.role === 'creator'),
      };
    });

    res.json(featured);
  } catch (error: any) {
    console.error('Get featured creators error:', error);
    res.status(500).json({ error: 'Failed to get featured creators' });
  }
});

// Get all creators (for gallery/search)
router.get('/gallery', async (req, res) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;
    
    let query = supabase
      .from('portfolios')
      .select(`
        *,
        creator:profiles!portfolios_creator_id_fkey(
          display_name,
          avatar_url,
          location
        )
      `)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category && category !== 'All') {
      query = query.eq('category', category as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data
    const gallery = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      creator: item.creator?.display_name || 'Unknown',
      category: item.category,
      image: item.image_url || item.file_url,
    }));

    res.json(gallery);
  } catch (error: any) {
    console.error('Get gallery error:', error);
    res.status(500).json({ error: 'Failed to get gallery' });
  }
});

export default router;

