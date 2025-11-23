import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Report content
 */
router.post('/report', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentType, contentId, reason, description } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: 'Content type, ID, and reason are required' });
    }

    const result = await pool.query(
      `INSERT INTO moderation_reports (
        reporter_id, content_type, content_id, reason, description, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
      [req.userId, contentType, contentId, reason, description || null]
    );

    // Notify admins
    const adminResult = await pool.query(
      `SELECT user_id FROM user_roles WHERE role = 'admin'`
    );

    for (const admin of adminResult.rows) {
      await notificationService.createNotification(
        admin.user_id,
        'content_reported',
        'New Content Report',
        `A ${contentType} has been reported: ${reason}`,
        { report_id: result.rows[0].id, content_type: contentType, content_id: contentId }
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Report content error:', error);
    res.status(500).json({ error: 'Failed to report content' });
  }
});

/**
 * Get reports (admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { status, contentType, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        mr.*,
        p1.display_name as reporter_name,
        p2.display_name as moderator_name
      FROM moderation_reports mr
      LEFT JOIN profiles p1 ON mr.reporter_id = p1.user_id
      LEFT JOIN profiles p2 ON mr.moderator_id = p2.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND mr.status = $${paramCount++}`;
      params.push(status);
    }

    if (contentType) {
      query += ` AND mr.content_type = $${paramCount++}`;
      params.push(contentType);
    }

    query += ` ORDER BY mr.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

/**
 * Take moderation action (admin only)
 */
router.post('/:reportId/action', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { reportId } = req.params;
    const { actionType, reason, durationDays, notes } = req.body;

    if (!actionType || !reason) {
      return res.status(400).json({ error: 'Action type and reason are required' });
    }

    // Get report
    const reportResult = await pool.query(
      'SELECT * FROM moderation_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // Create moderation action
    const actionResult = await pool.query(
      `INSERT INTO moderation_actions (
        report_id, moderator_id, action_type, content_type, content_id, reason, duration_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        reportId,
        req.userId,
        actionType,
        report.content_type,
        report.content_id,
        reason,
        durationDays ? parseInt(durationDays) : null,
      ]
    );

    // Update report status
    await pool.query(
      `UPDATE moderation_reports
       SET status = 'resolved',
           moderator_id = $1,
           moderator_notes = $2,
           action_taken = $3,
           updated_at = now()
       WHERE id = $4`,
      [req.userId, notes || null, actionType, reportId]
    );

    // Apply action based on type
    if (actionType === 'delete') {
      // Delete content based on type
      if (report.content_type === 'product') {
        await pool.query('UPDATE products SET is_active = false WHERE id = $1', [report.content_id]);
      } else if (report.content_type === 'post') {
        await pool.query('DELETE FROM social_posts WHERE id = $1', [report.content_id]);
      }
      // Add more content types as needed
    } else if (actionType === 'suspend_user' || actionType === 'ban_user') {
      // Get content owner
      let ownerId = null;
      if (report.content_type === 'product') {
        const productResult = await pool.query('SELECT creator_id FROM products WHERE id = $1', [report.content_id]);
        ownerId = productResult.rows[0]?.creator_id;
      }

      if (ownerId) {
        // Create suspension/ban record (would need a user_suspensions table)
        // For now, just notify
        await notificationService.createNotification(
          ownerId,
          'account_action',
          actionType === 'ban_user' ? 'Account Banned' : 'Account Suspended',
          reason,
          { duration_days: durationDays }
        );
      }
    }

    res.json(actionResult.rows[0]);
  } catch (error: any) {
    console.error('Take action error:', error);
    res.status(500).json({ error: 'Failed to take action' });
  }
});

/**
 * Get moderation rules (admin only)
 */
router.get('/rules', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM moderation_rules WHERE is_active = true ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

/**
 * Create moderation rule (admin only)
 */
router.post('/rules', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { ruleType, pattern, action, severity } = req.body;

    if (!ruleType || !pattern || !action) {
      return res.status(400).json({ error: 'Rule type, pattern, and action are required' });
    }

    const result = await pool.query(
      `INSERT INTO moderation_rules (rule_type, pattern, action, severity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ruleType, pattern, action, severity || 'medium']
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

export default router;

