import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Get testimonials (from reviews with high ratings)
router.get('/', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Validate limit
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        error: 'Invalid limit. Must be a number between 1 and 100.' 
      });
    }

    // Get reviews with rating >= 4
    // Note: reviewer_id references auth.users(id), creator_id references profiles(user_id)
    let reviews: any[] = [];

    try {
      const result = await supabase
        .from('reviews')
        .select('*')
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .limit(limitNum);

      if (result.error) {
        // Handle Supabase errors
        const errorCode = result.error.code || '';
        const errorMessage = result.error.message || '';
        
        // If table doesn't exist or is not accessible, use defaults
        if (
          errorCode === 'PGRST116' || 
          errorCode === '42P01' || // PostgreSQL: relation does not exist
          errorMessage.includes('relation') || 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('schema cache')
        ) {
          console.log('Reviews table not available, using default testimonials');
          reviews = [];
        } else {
          // For other errors, log but continue with defaults
          console.error('Error fetching reviews:', result.error);
          reviews = [];
        }
      } else {
        reviews = result.data || [];
      }
    } catch (dbError: any) {
      // Catch any unexpected errors and use defaults
      console.error('Unexpected error fetching reviews:', dbError);
      reviews = [];
    }

    if (!reviews || reviews.length === 0) {
      // Return default testimonials if no reviews
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
      return res.json(defaultTestimonials.slice(0, Number(limit)));
    }

    // Get reviewer profiles (reviewer_id is auth.users.id, need to match with profiles.user_id)
    let reviewerProfiles: any[] = [];
    let creatorProfiles: any[] = [];

    if (reviews && reviews.length > 0) {
      try {
        const reviewerIds = [...new Set(reviews.map((r: any) => r.reviewer_id).filter(Boolean))];
        if (reviewerIds.length > 0) {
          const reviewerResult = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', reviewerIds);
          
          reviewerProfiles = reviewerResult.data || [];
          if (reviewerResult.error) {
            console.error('Error fetching reviewer profiles:', reviewerResult.error);
          }
        }

        // Get creator profiles (creator_id references profiles.user_id)
        const creatorIds = [...new Set(reviews.map((r: any) => r.creator_id).filter(Boolean))];
        if (creatorIds.length > 0) {
          const creatorResult = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', creatorIds);
          
          creatorProfiles = creatorResult.data || [];
          if (creatorResult.error) {
            console.error('Error fetching creator profiles:', creatorResult.error);
          }
        }
      } catch (profileError: any) {
        console.error('Error fetching profiles:', profileError);
        // Continue with empty profiles - we'll use defaults
      }
    }

    // Create maps for quick lookup
    const reviewerMap = new Map(
      (reviewerProfiles || []).map((p: any) => [p.user_id, p])
    );
    const creatorMap = new Map(
      (creatorProfiles || []).map((p: any) => [p.user_id, p])
    );

    // Transform to testimonial format
    const testimonials = reviews.map((review: any) => {
      const reviewer = reviewerMap.get(review.reviewer_id);
      const creator = creatorMap.get(review.creator_id);
      
      return {
        name: reviewer?.display_name || 'Anonymous',
        role: creator?.display_name || 'Creator',
        image: reviewer?.avatar_url || '/placeholder.svg',
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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({ 
      error: 'Failed to get testimonials',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

