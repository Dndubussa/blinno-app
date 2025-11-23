import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get user's notifications
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [req.userId];
    let paramCount = 2;

    if (unreadOnly === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Get unread count
    const unreadCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count || 0),
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * Mark notification as read
 */
router.put('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE user_id = $1 AND is_read = false`,
      [req.userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * Delete notification
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * Get notification preferences
 */
router.get('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      const insertResult = await pool.query(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
        [req.userId]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * Update notification preferences
 */
router.put('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email_enabled, sms_enabled, push_enabled, in_app_enabled, preferences } = req.body;

    const result = await pool.query(
      `UPDATE notification_preferences
       SET email_enabled = COALESCE($1, email_enabled),
           sms_enabled = COALESCE($2, sms_enabled),
           push_enabled = COALESCE($3, push_enabled),
           in_app_enabled = COALESCE($4, in_app_enabled),
           preferences = COALESCE($5, preferences),
           updated_at = now()
       WHERE user_id = $6
       RETURNING *`,
      [
        email_enabled,
        sms_enabled,
        push_enabled,
        in_app_enabled,
        preferences ? JSON.stringify(preferences) : null,
        req.userId,
      ]
    );

    if (result.rows.length === 0) {
      // Create if doesn't exist
      const insertResult = await pool.query(
        `INSERT INTO notification_preferences (
          user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          req.userId,
          email_enabled ?? true,
          sms_enabled ?? false,
          push_enabled ?? true,
          in_app_enabled ?? true,
          preferences ? JSON.stringify(preferences) : '{}',
        ]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;

