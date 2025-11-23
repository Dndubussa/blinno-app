import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get articles for current journalist
router.get('/articles', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM news_articles WHERE journalist_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to get articles' });
  }
});

// Create article
router.post('/articles', authenticate, requireRole('journalist'), async (req: AuthRequest, res) => {
  try {
    const { title, content, excerpt, category, tags, coverImageUrl, isPublished, isFeatured } = req.body;
    const result = await pool.query(
      `INSERT INTO news_articles (journalist_id, title, content, excerpt, category, tags, cover_image_url, is_published, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.userId,
        title,
        content,
        excerpt || null,
        category,
        tags || [],
        coverImageUrl || null,
        isPublished || false,
        isFeatured || false,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news_categories ORDER BY name');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;

