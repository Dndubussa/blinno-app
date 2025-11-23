import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// Get profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.email
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get roles
    const rolesResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );

    res.json({
      ...result.rows[0],
      roles: rolesResult.rows.map(r => r.role),
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/me', authenticate, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const { displayName, bio, location, phone, website, socialMedia } = req.body;
    
    let avatarUrl = null;
    if (req.file) {
      avatarUrl = getFileUrl(req.file.path);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(displayName);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount++}`);
      values.push(website);
    }
    if (socialMedia !== undefined) {
      updates.push(`social_media = $${paramCount++}`);
      values.push(JSON.stringify(socialMedia));
    }
    if (avatarUrl) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.userId);
    updates.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE profiles
       SET ${updates.join(', ')}
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

