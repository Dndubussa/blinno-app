import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get user's wishlists
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: wishlists, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        wishlist_items(count)
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to include item_count
    const transformed = (wishlists || []).map((w: any) => ({
      ...w,
      item_count: w.wishlist_items?.[0]?.count || 0,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get wishlists error:', error);
    res.status(500).json({ error: 'Failed to get wishlists' });
  }
});

/**
 * Create a wishlist
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, isPublic } = req.body;

    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        user_id: req.userId,
        name: name || 'My Wishlist',
        is_public: isPublic || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create wishlist error:', error);
    res.status(500).json({ error: 'Failed to create wishlist' });
  }
});

/**
 * Add item to wishlist
 */
router.post('/:wishlistId/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId } = req.params;
    const { itemType, itemId, notes } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'Item type and ID are required' });
    }

    // Verify wishlist ownership
    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('*')
      .eq('id', wishlistId)
      .eq('user_id', req.userId)
      .single();

    if (wishlistError || !wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        wishlist_id: wishlistId,
        item_type: itemType,
        item_id: itemId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Item already in wishlist' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Add item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

/**
 * Remove item from wishlist
 */
router.delete('/:wishlistId/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId, itemId } = req.params;
    const { itemType } = req.query;

    if (!itemType) {
      return res.status(400).json({ error: 'Item type is required' });
    }

    // Verify wishlist ownership
    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('*')
      .eq('id', wishlistId)
      .eq('user_id', req.userId)
      .single();

    if (wishlistError || !wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('wishlist_id', wishlistId)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error: any) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

/**
 * Get wishlist items
 */
router.get('/:wishlistId/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wishlistId } = req.params;

    // Verify wishlist ownership or public access
    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('*')
      .eq('id', wishlistId)
      .or(`user_id.eq.${req.userId},is_public.eq.true`)
      .single();

    if (wishlistError || !wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const { data: items, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('wishlist_id', wishlistId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch item details based on type
    const enrichedItems = await Promise.all((items || []).map(async (item: any) => {
      let itemTitle = null;
      let itemImage = null;

      if (item.item_type === 'product') {
        const { data: product } = await supabase
          .from('products')
          .select('title, image_url')
          .eq('id', item.item_id)
          .single();
        itemTitle = product?.title;
        itemImage = product?.image_url;
      } else if (item.item_type === 'portfolio') {
        const { data: portfolio } = await supabase
          .from('portfolios')
          .select('title, image_url')
          .eq('id', item.item_id)
          .single();
        itemTitle = portfolio?.title;
        itemImage = portfolio?.image_url;
      } else if (item.item_type === 'creator') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', item.item_id)
          .single();
        itemTitle = profile?.display_name;
        itemImage = profile?.avatar_url;
      }

      return {
        ...item,
        item_title: itemTitle,
        item_image: itemImage,
      };
    }));

    res.json(enrichedItems);
  } catch (error: any) {
    console.error('Get wishlist items error:', error);
    res.status(500).json({ error: 'Failed to get wishlist items' });
  }
});

/**
 * Check if item is in wishlist
 */
router.get('/check/:itemType/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { itemType, itemId } = req.params;

    const { data: wishlistItems, error } = await supabase
      .from('wishlist_items')
      .select(`
        wishlist_id,
        wishlists!inner(id, name, user_id)
      `)
      .eq('wishlists.user_id', req.userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .limit(1);

    if (error) {
      throw error;
    }

    const inWishlist = (wishlistItems?.length || 0) > 0;
    const wishlist = inWishlist ? {
      id: wishlistItems[0].wishlists.id,
      name: wishlistItems[0].wishlists.name,
    } : null;

    res.json({ inWishlist, wishlist });
  } catch (error: any) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ error: 'Failed to check wishlist' });
  }
});

export default router;
