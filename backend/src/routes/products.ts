import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// Get all products (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, location, search, isActive = 'true' } = req.query;
    
    let query = `
      SELECT p.*, pr.display_name, pr.avatar_url
      FROM products p
      JOIN profiles pr ON p.creator_id = pr.user_id
      WHERE p.is_active = $1
    `;
    const params: any[] = [isActive === 'true'];
    let paramCount = 2;

    if (category && category !== 'all') {
      query += ` AND p.category = $${paramCount++}`;
      params.push(category);
    }
    if (location && location !== 'all') {
      query += ` AND p.location = $${paramCount++}`;
      params.push(location);
    }
    if (search) {
      query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pr.display_name, pr.avatar_url, pr.location as creator_location
       FROM products p
       JOIN profiles pr ON p.creator_id = pr.user_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
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

    let imageUrl = null;
    if (req.file) {
      imageUrl = getFileUrl(req.file.path);
    }

    const result = await pool.query(
      `INSERT INTO products (creator_id, title, description, price, category, location, image_url, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.userId,
        title,
        description || null,
        parseFloat(price),
        category,
        location || null,
        imageUrl,
        stockQuantity ? parseInt(stockQuantity) : 0
      ]
    );

    res.status(201).json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT creator_id FROM products WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
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
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(parseFloat(price));
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (stockQuantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount++}`);
      values.push(parseInt(stockQuantity));
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive === 'true' || isActive === true);
    }
    if (req.file) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(getFileUrl(req.file.path));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    updates.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE products
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
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
    const checkResult = await pool.query(
      'SELECT creator_id FROM products WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (checkResult.rows[0].creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

