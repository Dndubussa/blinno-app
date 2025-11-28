import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Get testimonials (from reviews with high ratings)
router.get('/', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get reviews with rating >= 4 and include reviewer info
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(
          display_name,
          avatar_url
        ),
        reviewee:profiles!reviews_reviewee_id_fkey(
          display_name
        )
      `)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      throw error;
    }

    // Transform to testimonial format
    const testimonials = (reviews || []).map((review: any) => {
      // Determine role based on reviewee's profile or default
      const role = review.reviewee?.display_name || 'User';
      
      return {
        name: review.reviewer?.display_name || 'Anonymous',
        role: role,
        image: review.reviewer?.avatar_url || '/placeholder.svg',
        rating: review.rating,
        text: review.comment || 'Great experience!',
      };
    });

    // If we don't have enough testimonials, pad with defaults
    // In production, you might want to fetch from a dedicated testimonials table
    if (testimonials.length < Number(limit)) {
      const defaultTestimonials = [
        {
          name: 'Amina Hassan',
          role: 'Digital Artist',
          image: '/placeholder.svg',
          rating: 5,
          text: 'BLINNO has transformed how I connect with clients. I\'ve grown my business by 300% in just 6 months!',
        },
        {
          name: 'John Mwakasege',
          role: 'Music Producer',
          image: '/placeholder.svg',
          rating: 5,
          text: 'The platform made it easy to showcase my work and collaborate with other talented creators.',
        },
      ];
      
      testimonials.push(...defaultTestimonials.slice(0, Number(limit) - testimonials.length));
    }

    res.json(testimonials);
  } catch (error: any) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ error: 'Failed to get testimonials' });
  }
});

export default router;

