import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get user's notifications
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      throw error;
    }

    // Get unread count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_read', false);

    res.json({
      notifications: notifications || [],
      unreadCount: count || 0,
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

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(data);
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
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

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

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      throw error;
    }

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
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create default preferences
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: req.userId })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return res.json(newPrefs);
    }

    if (error) {
      throw error;
    }

    res.json(data);
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

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (email_enabled !== undefined) updates.email_enabled = email_enabled;
    if (sms_enabled !== undefined) updates.sms_enabled = sms_enabled;
    if (push_enabled !== undefined) updates.push_enabled = push_enabled;
    if (in_app_enabled !== undefined) updates.in_app_enabled = in_app_enabled;
    if (preferences !== undefined) updates.preferences = typeof preferences === 'string' ? preferences : JSON.stringify(preferences);

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      // Create if doesn't exist
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: req.userId,
          email_enabled: email_enabled ?? true,
          sms_enabled: sms_enabled ?? false,
          push_enabled: push_enabled ?? true,
          in_app_enabled: in_app_enabled ?? true,
          preferences: preferences ? (typeof preferences === 'string' ? preferences : JSON.stringify(preferences)) : '{}',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return res.json(newPrefs);
    }

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
