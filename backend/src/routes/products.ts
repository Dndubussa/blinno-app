import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, uploadToSupabaseStorage } from '../middleware/upload.js';
import { checkProductLimit } from '../utils/subscriptionLimits.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = '20', offset = '0' } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (category) {
      query = query.eq('category', category as string);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { title, description, price, category, location, stockQuantity } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }

    // Check subscription limits
    const limitCheck = await checkProductLimit(req.userId!);
    if (!limitCheck.canCreate) {
      return res.status(403).json({ 
        error: `Product limit reached. Your plan allows up to ${limitCheck.limit} products.` 
      });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToSupabaseStorage(req.file, 'products', req.userId);
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        creator_id: req.userId,
        title,
        description: description || null,
        price: parseFloat(price),
        category,
        location: location || null,
        image_url: imageUrl,
        stock_quantity: stockQuantity ? parseInt(stockQuantity) : 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, location, stockQuantity, isActive } = req.body;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('products')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = parseFloat(price);
    if (category !== undefined) updates.category = category;
    if (location !== undefined) updates.location = location;
    if (stockQuantity !== undefined) updates.stock_quantity = parseInt(stockQuantity);
    if (isActive !== undefined) updates.is_active = isActive === 'true' || isActive === true;
    if (req.file) {
      updates.image_url = await uploadToSupabaseStorage(req.file, 'products', req.userId);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('products')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
