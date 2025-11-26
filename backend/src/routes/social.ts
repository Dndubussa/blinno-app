import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Follow a user
 */
router.post('/follow/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', req.userId)
      .eq('following_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    await supabase
      .from('user_follows')
      .insert({
        follower_id: req.userId,
        following_id: userId,
      });

    // Notify user
    await notificationService.createNotification(
      userId,
      'new_follower',
      'New Follower',
      'Someone started following you',
      { follower_id: req.userId }
    );

    res.json({ message: 'Successfully followed user' });
  } catch (error: any) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

/**
 * Unfollow a user
 */
router.post('/unfollow/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', req.userId)
      .eq('following_id', userId);

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error: any) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

/**
 * Get followers
 */
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        follower:profiles!user_follows_follower_id_fkey(display_name, avatar_url, bio)
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((uf: any) => ({
      ...uf,
      display_name: uf.follower?.display_name,
      avatar_url: uf.follower?.avatar_url,
      bio: uf.follower?.bio,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

/**
 * Get following
 */
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        following:profiles!user_follows_following_id_fkey(display_name, avatar_url, bio)
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((uf: any) => ({
      ...uf,
      display_name: uf.following?.display_name,
      avatar_url: uf.following?.avatar_url,
      bio: uf.following?.bio,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
});

/**
 * Check if following
 */
router.get('/is-following/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', req.userId)
      .eq('following_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ isFollowing: !!data });
  } catch (error: any) {
    console.error('Check following error:', error);
    res.status(500).json({ error: 'Failed to check following status' });
  }
});

/**
 * Get follower/following counts
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [followersCount, followingCount] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    res.json({
      followers: followersCount.count || 0,
      following: followingCount.count || 0,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Create a social post
 */
router.post('/posts', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, mediaUrls, postType, portfolioId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: req.userId,
        content,
        media_urls: mediaUrls || null,
        post_type: postType || 'text',
        portfolio_id: portfolioId || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * Get social feed (posts from followed users)
 */
router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Get list of followed user IDs
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', req.userId);

    const followingIds = (following || []).map((f: any) => f.following_id);
    followingIds.push(req.userId); // Include own posts

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        author:profiles!social_posts_user_id_fkey(display_name, avatar_url)
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    // Check if user liked each post
    const postIds = (posts || []).map((p: any) => p.id);
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', req.userId)
      .in('post_id', postIds);

    const likedPostIds = new Set((likes || []).map((l: any) => l.post_id));

    // Transform to match expected format
    const transformed = (posts || []).map((sp: any) => ({
      ...sp,
      display_name: sp.author?.display_name,
      avatar_url: sp.author?.avatar_url,
      is_liked: likedPostIds.has(sp.id),
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

/**
 * Like a post
 */
router.post('/posts/:postId/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;

    // Check if already liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', req.userId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', req.userId);
      return res.json({ liked: false });
    }

    // Like
    await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: req.userId,
      });

    res.json({ liked: true });
  } catch (error: any) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

/**
 * Comment on a post
 */
router.post('/posts/:postId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: req.userId,
        content,
        parent_comment_id: parentCommentId || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Comment post error:', error);
    res.status(500).json({ error: 'Failed to comment on post' });
  }
});

/**
 * Get post comments
 */
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        author:profiles!post_comments_user_id_fkey(display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((pc: any) => ({
      ...pc,
      display_name: pc.author?.display_name,
      avatar_url: pc.author?.avatar_url,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;
