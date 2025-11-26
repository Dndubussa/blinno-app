import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get articles for current journalist
router.get('/articles', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('journalist_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to get articles' });
  }
});

// Create article
router.post('/articles', authenticate, requireRole('journalist'), async (req: AuthRequest, res) => {
  try {
    const { title, content, excerpt, category, tags, coverImageUrl, isPublished, isFeatured } = req.body;
    
    const { data, error } = await supabase
      .from('news_articles')
      .insert({
        journalist_id: req.userId,
        title,
        content,
        excerpt: excerpt || null,
        category,
        tags: tags || [],
        cover_image_url: coverImageUrl || null,
        is_published: isPublished || false,
        is_featured: isFeatured || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
