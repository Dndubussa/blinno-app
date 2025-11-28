import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

// Password validation function
const validatePasswordRequirements = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one capital letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  return { isValid: true };
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role = 'user', firstName, middleName, lastName, phoneNumber, country, termsAccepted } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must accept the Terms of Service to create an account' });
    }

    // Validate password requirements
    const passwordValidation = validatePasswordRequirements(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
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

    // Create profile with additional fields
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone: phoneNumber,
        location: country,
        is_creator: ['creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer'].includes(role),
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
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
        email_confirmed_at: authData.user.email_confirmed_at,
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
        email_confirmed_at: authData.user.email_confirmed_at,
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

    // With Supabase, the proper way to handle password reset is:
    // 1. Use the token to create a new session (this verifies the token)
    // 2. Once verified, update the password
    
    // Attempt to exchange the recovery token for a session
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(token);
    
    if (error) {
      console.error('Password reset token exchange error:', error);
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }
    
    // If exchange succeeded, update the password
    if (data?.session?.user?.id) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        data.session.user.id,
        { password }
      );
      
      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({ error: 'Failed to update password' });
      }
      
      return res.json({ message: 'Password reset successfully' });
    }
    
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user email from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(req.userId);
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return res.json({ message: 'Email is already verified' });
    }

    // Resend verification email using Supabase Auth
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${process.env.APP_URL || 'https://www.blinno.app'}/auth/callback`,
      },
    });

    if (resendError) {
      console.error('Resend verification error:', resendError);
      return res.status(500).json({ error: 'Failed to resend verification email' });
    }

    res.json({ message: 'Verification email sent successfully' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Google OAuth (placeholder - implement OAuth flow)
router.post('/google', async (req, res) => {
  // TODO: Implement Google OAuth
  res.status(501).json({ error: 'Google OAuth not yet implemented' });
});

export default router;

