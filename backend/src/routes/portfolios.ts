import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, uploadToSupabaseStorage } from '../middleware/upload.js';
import { checkPortfolioLimit } from '../utils/subscriptionLimits.js';

const router = express.Router();

// Get all portfolios (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = '20', offset = '0', creatorId } = req.query;
    
    let query = supabase
      .from('portfolios')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category as string);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (creatorId) {
      query = query.eq('creator_id', creatorId as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Failed to get portfolios' });
  }
});

// Get portfolio by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
});

// Create portfolio
router.post('/', authenticate, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, tags } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    // Check subscription limits for portfolios using shared utility function
    const limitCheck = await checkPortfolioLimit(req.userId!);
    if (!limitCheck.canCreate) {
      return res.status(403).json({ 
        error: `Portfolio limit reached. Your plan allows up to ${limitCheck.limit} portfolios.` 
      });
    }

    let imageUrl = null;
    let fileUrl = null;

    // Accept image_url from form data (for migration compatibility) or file upload
    if (req.body.image_url) {
      imageUrl = req.body.image_url;
    } else if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.image?.[0]) {
        imageUrl = await uploadToSupabaseStorage(files.image[0], 'portfolios', req.userId);
      }
      if (files.file?.[0]) {
        fileUrl = await uploadToSupabaseStorage(files.file[0], 'portfolios', req.userId);
      }
    }

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        creator_id: req.userId,
        title,
        description: description || null,
        category,
        image_url: imageUrl,
        file_url: fileUrl,
        tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

// Update portfolio
router.put('/:id', authenticate, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, isFeatured } = req.body;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('portfolios')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
    if (isFeatured !== undefined) updates.is_featured = isFeatured;

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.image?.[0]) {
        updates.image_url = await uploadToSupabaseStorage(files.image[0], 'portfolios', req.userId);
      }
      if (files.file?.[0]) {
        updates.file_url = await uploadToSupabaseStorage(files.file[0], 'portfolios', req.userId);
      }
    }

    const { data, error } = await supabase
      .from('portfolios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
});

// Delete portfolio
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('portfolios')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error: any) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

export default router;

