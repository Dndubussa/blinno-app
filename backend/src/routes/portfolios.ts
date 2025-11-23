import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// Get all portfolios (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, creatorId, featured } = req.query;
    
    let query = `
      SELECT p.*, pr.display_name, pr.avatar_url
      FROM portfolios p
      JOIN profiles pr ON p.creator_id = pr.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND p.category = $${paramCount++}`;
      params.push(category);
    }
    if (creatorId) {
      query += ` AND p.creator_id = $${paramCount++}`;
      params.push(creatorId);
    }
    if (featured === 'true') {
      query += ` AND p.is_featured = true`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Failed to get portfolios' });
  }
});

// Get portfolio by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pr.display_name, pr.avatar_url
       FROM portfolios p
       JOIN profiles pr ON p.creator_id = pr.user_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(result.rows[0]);
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

    let imageUrl = null;
    let fileUrl = null;

    // Accept image_url from form data (for migration compatibility) or file upload
    if (req.body.image_url) {
      imageUrl = req.body.image_url;
    } else if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.image?.[0]) {
        imageUrl = getFileUrl(files.image[0].path);
      }
      if (files.file?.[0]) {
        fileUrl = getFileUrl(files.file[0].path);
      }
    }

    const result = await pool.query(
      `INSERT INTO portfolios (creator_id, title, description, category, image_url, file_url, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.userId,
        title,
        description || null,
        category,
        imageUrl,
        fileUrl,
        tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : []
      ]
    );

    res.status(201).json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT creator_id FROM portfolios WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (checkResult.rows[0].creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(Array.isArray(tags) ? tags : JSON.parse(tags));
    }
    if (isFeatured !== undefined) {
      updates.push(`is_featured = $${paramCount++}`);
      values.push(isFeatured);
    }

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.image?.[0]) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(getFileUrl(files.image[0].path));
      }
      if (files.file?.[0]) {
        updates.push(`file_url = $${paramCount++}`);
        values.push(getFileUrl(files.file[0].path));
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    updates.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE portfolios
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT creator_id FROM portfolios WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (checkResult.rows[0].creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM portfolios WHERE id = $1', [id]);

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error: any) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

export default router;

