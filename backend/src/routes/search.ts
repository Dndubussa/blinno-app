import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Global search endpoint
router.get('/', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.json({ categories: [], creators: [], content: [] });
    }

    const searchQuery = q.toLowerCase().trim();
    const results: any = {
      categories: [],
      creators: [],
      content: [],
    };

    // Search categories (static navigation items)
    const categoryNames = [
      'News & Media', 'Creativity', 'Marketplace', 'Events', 
      'Music', 'Restaurants', 'Lodging', 'Education'
    ];
    
    categoryNames.forEach(name => {
      if (name.toLowerCase().includes(searchQuery)) {
        let path = '/marketplace';
        if (name === 'Events') path = '/events';
        else if (name === 'Music') path = '/music';
        else if (name === 'Marketplace') path = '/marketplace';
        else path = `/category/${name.toLowerCase().replace(/\s+/g, '-')}`;
        
        results.categories.push({ name, path, type: 'Category' });
      }
    });

    // Search creators (from profiles)
    const { data: creators } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio, avatar_url')
      .eq('is_creator', true)
      .or(`display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
      .limit(Number(limit));

    if (creators) {
      results.creators = creators.map((creator: any) => ({
        name: `${creator.display_name} - Creator`,
        type: 'Creator',
        id: creator.user_id,
        path: `/creator/${creator.user_id}`,
      }));
    }

    // Search content (from portfolios, products, events)
    const contentResults: any[] = [];

    // Search portfolios
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id, title, category')
      .or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .limit(5);

    if (portfolios) {
      portfolios.forEach((portfolio: any) => {
        contentResults.push({
          name: portfolio.title,
          type: 'Content',
          path: `/portfolio/${portfolio.id}`,
        });
      });
    }

    // Search products
    const { data: products } = await supabase
      .from('products')
      .select('id, title, category')
      .or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .eq('is_active', true)
      .limit(5);

    if (products) {
      products.forEach((product: any) => {
        contentResults.push({
          name: product.title,
          type: 'Content',
          path: `/product/${product.id}`,
        });
      });
    }

    // Search events
    const { data: events } = await supabase
      .from('organized_events')
      .select('id, title, category')
      .or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .eq('is_published', true)
      .limit(5);

    if (events) {
      events.forEach((event: any) => {
        contentResults.push({
          name: event.title,
          type: 'Content',
          path: `/event/${event.id}`,
        });
      });
    }

    results.content = contentResults.slice(0, Number(limit));

    // Combine and limit total results
    const allResults = [
      ...results.categories,
      ...results.creators,
      ...results.content,
    ].slice(0, Number(limit));

    res.json(allResults);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

export default router;

