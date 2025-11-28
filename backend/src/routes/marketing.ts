import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { sendEmail, sendTemplatedEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Send marketing email to all users (Admin only)
 * Supports filtering by role, verified status, etc.
 */
router.post('/send', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { 
      subject, 
      html, 
      text, 
      templateName, 
      templateVariables = {},
      filters = {},
      batchSize = 50,
      testMode = false
    } = req.body;

    if (!subject && !templateName) {
      return res.status(400).json({ error: 'Subject or templateName is required' });
    }

    if (!html && !templateName) {
      return res.status(400).json({ error: 'HTML content or templateName is required' });
    }

    // Build query to get users
    let profilesQuery = supabase
      .from('profiles')
      .select('user_id, display_name, email_verified');

    // Apply filters
    if (filters.role) {
      // Get users with specific role
      const { data: roleUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', filters.role);
      
      const userIds = roleUsers?.map((r: any) => r.user_id) || [];
      if (userIds.length > 0) {
        profilesQuery = profilesQuery.in('user_id', userIds);
      } else {
        // No users with this role
        return res.json({
          success: true,
          sent: 0,
          failed: 0,
          message: 'No users found with the specified role',
        });
      }
    }

    if (filters.isCreator !== undefined) {
      profilesQuery = profilesQuery.eq('is_creator', filters.isCreator);
    }

    if (filters.emailVerified !== undefined) {
      // Note: email_verified might not be in profiles table, we'll filter after getting emails
    }

    if (filters.country) {
      profilesQuery = profilesQuery.eq('location', filters.country);
    }

    // Get profiles
    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No users found matching the filters',
      });
    }

    // Get unsubscribed users
    const userIds = profiles.map((p: any) => p.user_id);
    const { data: unsubscribed } = await supabase
      .from('unsubscribed_users')
      .select('user_id')
      .in('user_id', userIds);

    const unsubscribedIds = new Set((unsubscribed || []).map((u: any) => u.user_id));

    // Get user emails from Supabase Auth (excluding unsubscribed)
    for (const userId of userIds) {
      // Skip unsubscribed users
      if (unsubscribedIds.has(userId)) {
        continue;
      }

      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser?.user?.email) {
          // Apply email verification filter if specified
          if (filters.emailVerified !== undefined) {
            const isVerified = authUser.user.email_confirmed_at !== null;
            if (filters.emailVerified !== isVerified) {
              continue;
            }
          }

          // Check profile marketing preference
          const profile = profiles.find((p: any) => p.user_id === userId);
          if (profile?.marketing_emails_enabled === false) {
            continue;
          }

          userEmails.push({
            userId,
            email: authUser.user.email,
            displayName: profile?.display_name || 'User',
            verified: authUser.user.email_confirmed_at !== null,
          });
        }
      } catch (error) {
        console.error(`Failed to get email for user ${userId}:`, error);
      }
    }

    if (userEmails.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No valid user emails found',
      });
    }

    // Test mode: only send to first user
    const recipients = testMode ? userEmails.slice(0, 1) : userEmails;

    // Send emails in batches
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            let result;
            
            if (templateName) {
              // Use template
              result = await sendTemplatedEmail(
                templateName,
                recipient.email,
                {
                  userName: recipient.displayName,
                  userEmail: recipient.email,
                  ...templateVariables,
                },
                {
                  emailType: 'marketing',
                }
              );
            } else {
              // Use custom HTML
              // Replace variables in HTML
              let emailHtml = html;
              let emailText = text;
              let emailSubject = subject;

              Object.entries({
                userName: recipient.displayName,
                userEmail: recipient.email,
                ...templateVariables,
              }).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                emailHtml = emailHtml.replace(regex, String(value));
                emailText = emailText?.replace(regex, String(value));
                emailSubject = emailSubject.replace(regex, String(value));
              });

              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                html: emailHtml,
                text: emailText,
                emailType: 'marketing',
              });
            }

            if (result.success) {
              sent++;
            } else {
              failed++;
              errors.push({ email: recipient.email, error: result.error || 'Unknown error' });
            }
          } catch (error: any) {
            failed++;
            errors.push({ email: recipient.email, error: error.message || 'Failed to send email' });
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      total: recipients.length,
      testMode,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error('Send marketing email error:', error);
    res.status(500).json({ error: 'Failed to send marketing emails', details: error.message });
  }
});

/**
 * Get user statistics for marketing campaigns (Admin only)
 */
router.get('/stats', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { filters = {} } = req.query;

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get creators count
    const { count: creatorsCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_creator', true);

    // Get users by role
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role');

    const roleCounts: Record<string, number> = {};
    rolesData?.forEach((r: any) => {
      roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
    });

    // Get users by country
    const { data: locationsData } = await supabase
      .from('profiles')
      .select('location')
      .not('location', 'is', null);

    const countryCounts: Record<string, number> = {};
    locationsData?.forEach((p: any) => {
      const country = p.location || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    res.json({
      totalUsers: totalUsers || 0,
      creators: creatorsCount || 0,
      regularUsers: (totalUsers || 0) - (creatorsCount || 0),
      byRole: roleCounts,
      byCountry: countryCounts,
    });
  } catch (error: any) {
    console.error('Get marketing stats error:', error);
    res.status(500).json({ error: 'Failed to get marketing stats', details: error.message });
  }
});

export default router;

