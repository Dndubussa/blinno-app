import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role = 'user' } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'User already exists' });
      }
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        is_creator: ['creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer'].includes(role),
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // User was created but profile failed - this is okay, profile can be created later
    }

    // Assign roles
    const rolesToInsert = [role];
    if (role !== 'user') {
      rolesToInsert.push('user');
    }

    for (const roleToInsert of rolesToInsert) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleToInsert,
        })
        .select();

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Role assignment error:', roleError);
      }
    }

    // Get session token
    const token = authData.session?.access_token;

    // Send welcome email (non-blocking)
    sendWelcomeEmail(authData.user.email || '', displayName).catch((err) => {
      console.error('Failed to send welcome email:', err);
      // Don't fail registration if email fails
    });

    res.status(201).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        created_at: authData.user.created_at,
      },
      token: token || null, // Token might be null if email confirmation is required
      session: authData.session,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      token: authData.session.access_token,
      session: authData.session,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get user from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', '') || '');

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    // Get roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId);

    const roles = rolesData?.map(r => r.role) || ['user'];

    // If profile doesn't exist, return basic user info
    if (profileError && profileError.code === 'PGRST116') {
      return res.json({
        id: user.id,
        user_id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at !== null,
        display_name: user.email?.split('@')[0] || 'User',
        roles,
      });
    }

    res.json({
      ...profile,
      email: user.email,
      email_verified: user.email_confirmed_at !== null,
      roles,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Forgot password - request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use Supabase Auth to send password reset email
    // Since Resend is configured as Supabase's SMTP provider, the email will be sent through Resend
    const { data, error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${process.env.APP_URL || 'https://www.blinno.app'}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    // Email is sent via Supabase → Resend SMTP (configured in Supabase dashboard)
    // You can monitor it in Resend dashboard under the "Emails" tab

    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password - with token from email
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Use Supabase Auth to reset password
    // Note: This requires the user to be authenticated with the reset token
    // The token is typically handled via the redirect URL from the email
    // For API-based reset, you need to use Supabase's updateUser method
    // after verifying the token from the request headers or body

    // The token should be passed as a Bearer token in the Authorization header
    // or we need to create a session from the token first
    // For now, we'll use the admin client to update the password
    // In a real implementation, you'd verify the token and create a session first
    
    // Get user from token (if provided in Authorization header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Reset token is required' });
    }

    const resetToken = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(resetToken);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    // Update password using admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Google OAuth (placeholder - implement OAuth flow)
router.post('/google', async (req, res) => {
  // TODO: Implement Google OAuth
  res.status(501).json({ error: 'Google OAuth not yet implemented' });
});

export default router;

