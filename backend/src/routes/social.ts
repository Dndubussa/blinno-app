import express from 'express';
import { pool } from '../config/database.js';
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
    const existingResult = await pool.query(
      'SELECT * FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [req.userId, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    await pool.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
      [req.userId, userId]
    );

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

    await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [req.userId, userId]
    );

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

    const result = await pool.query(
      `SELECT 
        uf.*,
        p.display_name,
        p.avatar_url,
        p.bio
       FROM user_follows uf
       JOIN profiles p ON uf.follower_id = p.user_id
       WHERE uf.following_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
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

    const result = await pool.query(
      `SELECT 
        uf.*,
        p.display_name,
        p.avatar_url,
        p.bio
       FROM user_follows uf
       JOIN profiles p ON uf.following_id = p.user_id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
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

    const result = await pool.query(
      'SELECT * FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [req.userId, userId]
    );

    res.json({ isFollowing: result.rows.length > 0 });
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

    const followersResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1',
      [userId]
    );

    const followingResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      followers: parseInt(followersResult.rows[0].count || 0),
      following: parseInt(followingResult.rows[0].count || 0),
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

    const result = await pool.query(
      `INSERT INTO social_posts (user_id, content, media_urls, post_type, portfolio_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.userId,
        content,
        mediaUrls || null,
        postType || 'text',
        portfolioId || null,
      ]
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `SELECT 
        sp.*,
        p.display_name,
        p.avatar_url,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = sp.id AND pl.user_id = $1) > 0 as is_liked
       FROM social_posts sp
       JOIN profiles p ON sp.user_id = p.user_id
       WHERE sp.user_id IN (
         SELECT following_id FROM user_follows WHERE follower_id = $1
       ) OR sp.user_id = $1
       ORDER BY sp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
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
    const existingResult = await pool.query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.userId]
    );

    if (existingResult.rows.length > 0) {
      // Unlike
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, req.userId]
      );
      return res.json({ liked: false });
    }

    // Like
    await pool.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
      [postId, req.userId]
    );

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

    const result = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, content, parent_comment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, req.userId, content, parentCommentId || null]
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `SELECT 
        pc.*,
        p.display_name,
        p.avatar_url
       FROM post_comments pc
       JOIN profiles p ON pc.user_id = p.user_id
       WHERE pc.post_id = $1 AND pc.parent_comment_id IS NULL
       ORDER BY pc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;

