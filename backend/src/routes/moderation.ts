import express from 'express';
import { supabase } from '../config/supabase.js';
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

    const { data, error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: req.userId,
        content_type: contentType,
        content_id: contentId,
        reason,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await notificationService.createNotification(
          admin.user_id,
          'content_reported',
          'New Content Report',
          `A ${contentType} has been reported: ${reason}`,
          { report_id: data.id, content_type: contentType, content_id: contentId }
        );
      }
    }

    res.status(201).json(data);
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

    let query = supabase
      .from('moderation_reports')
      .select(`
        *,
        reporter:profiles!moderation_reports_reporter_id_fkey(display_name),
        moderator:profiles!moderation_reports_moderator_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (status) {
      query = query.eq('status', status as string);
    }
    if (contentType) {
      query = query.eq('content_type', contentType as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((mr: any) => ({
      ...mr,
      reporter_name: mr.reporter?.display_name,
      moderator_name: mr.moderator?.display_name,
    }));

    res.json(transformed);
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
    const { data: report, error: reportError } = await supabase
      .from('moderation_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Create moderation action
    const { data: action, error: actionError } = await supabase
      .from('moderation_actions')
      .insert({
        report_id: reportId,
        moderator_id: req.userId,
        action_type: actionType,
        content_type: report.content_type,
        content_id: report.content_id,
        reason,
        duration_days: durationDays ? parseInt(durationDays) : null,
      })
      .select()
      .single();

    if (actionError || !action) {
      throw actionError;
    }

    // Update report status
    await supabase
      .from('moderation_reports')
      .update({
        status: 'resolved',
        moderator_id: req.userId,
        moderator_notes: notes || null,
        action_taken: actionType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    // Apply action based on type
    if (actionType === 'delete') {
      // Delete content based on type
      if (report.content_type === 'product') {
        await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', report.content_id);
      } else if (report.content_type === 'post') {
        await supabase
          .from('social_posts')
          .delete()
          .eq('id', report.content_id);
      }
      // Add more content types as needed
    } else if (actionType === 'suspend_user' || actionType === 'ban_user') {
      // Get content owner
      let ownerId = null;
      if (report.content_type === 'product') {
        const { data: product } = await supabase
          .from('products')
          .select('creator_id')
          .eq('id', report.content_id)
          .single();
        ownerId = product?.creator_id;
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

    res.json(action);
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
    const { data, error } = await supabase
      .from('moderation_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
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

    const { data, error } = await supabase
      .from('moderation_rules')
      .insert({
        rule_type: ruleType,
        pattern,
        action,
        severity: severity || 'medium',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

export default router;
