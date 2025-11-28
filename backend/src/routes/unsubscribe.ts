import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Unsubscribe user from marketing emails
 * Can be called with or without authentication
 */
router.post('/', async (req, res) => {
  try {
    const { email, userId, reason } = req.body;

    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId is required' });
    }

    let targetUserId: string | null = null;

    // If userId provided, use it directly
    if (userId) {
      targetUserId = userId;
    } else if (email) {
      // Get userId from email via Supabase Auth
      // Note: This requires admin access or the user to be authenticated
      if (req.headers.authorization) {
        // User is authenticated, get their own userId
        const token = req.headers.authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user && user.email === email) {
          targetUserId = user.id;
        }
      }

      // If still no userId, try to find by email in profiles
      if (!targetUserId) {
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && authUsers?.users) {
          const authUser = authUsers.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (authUser) {
            targetUserId = authUser.id;
          }
        }
      }
    }

    if (!targetUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already unsubscribed
    const { data: existing } = await supabase
      .from('unsubscribed_users')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (existing) {
      return res.json({
        success: true,
        message: 'You are already unsubscribed from marketing emails',
        alreadyUnsubscribed: true,
      });
    }

    // Get user email if not provided
    let userEmail = email;
    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      userEmail = authUser?.user?.email || '';
    }

    // Add to unsubscribe list
    const { error: insertError } = await supabase
      .from('unsubscribed_users')
      .insert({
        user_id: targetUserId,
        email: userEmail,
        reason: reason || null,
      });

    if (insertError) {
      throw insertError;
    }

    // Update profile preference
    await supabase
      .from('profiles')
      .update({ marketing_emails_enabled: false })
      .eq('user_id', targetUserId);

    res.json({
      success: true,
      message: 'You have been unsubscribed from marketing emails',
    });
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe', details: error.message });
  }
});

/**
 * Resubscribe user to marketing emails (authenticated only)
 */
router.post('/resubscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Remove from unsubscribe list
    const { error: deleteError } = await supabase
      .from('unsubscribed_users')
      .delete()
      .eq('user_id', req.userId);

    if (deleteError) {
      throw deleteError;
    }

    // Update profile preference
    await supabase
      .from('profiles')
      .update({ marketing_emails_enabled: true })
      .eq('user_id', req.userId);

    res.json({
      success: true,
      message: 'You have been resubscribed to marketing emails',
    });
  } catch (error: any) {
    console.error('Resubscribe error:', error);
    res.status(500).json({ error: 'Failed to resubscribe', details: error.message });
  }
});

/**
 * Check unsubscribe status (authenticated only)
 */
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: unsubscribed } = await supabase
      .from('unsubscribed_users')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('marketing_emails_enabled')
      .eq('user_id', req.userId)
      .single();

    res.json({
      unsubscribed: !!unsubscribed,
      marketingEmailsEnabled: profile?.marketing_emails_enabled !== false,
      unsubscribedAt: unsubscribed?.unsubscribed_at || null,
    });
  } catch (error: any) {
    console.error('Get unsubscribe status error:', error);
    res.status(500).json({ error: 'Failed to get unsubscribe status', details: error.message });
  }
});

export default router;

