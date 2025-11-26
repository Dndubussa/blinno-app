import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = express.Router();

/**
 * Get 2FA status
 */
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('is_enabled')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      isEnabled: data?.is_enabled || false,
    });
  } catch (error: any) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * Setup 2FA (generate secret and QR code)
 */
router.post('/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if already enabled
    const { data: existing } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_enabled', true)
      .single();

    if (existing) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BLINNO (${req.userId})`,
      issuer: 'BLINNO',
    });

    // Get user email for QR code label
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);
    const userEmail = authUser?.user?.email || req.userId;

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret (not enabled yet)
    await supabase
      .from('two_factor_auth')
      .upsert({
        user_id: req.userId,
        secret: secret.base32,
        is_enabled: false,
      }, { onConflict: 'user_id' });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error: any) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * Verify and enable 2FA
 */
router.post('/verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get secret
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('secret')
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: '2FA not set up. Please setup first.' });
    }

    const secret = data.secret;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    });

    if (!verified) {
      // Log failed attempt
      await supabase
        .from('two_factor_attempts')
        .insert({
          user_id: req.userId,
          success: false,
        });

      return res.status(400).json({ error: 'Invalid token' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Enable 2FA and store backup codes
    await supabase
      .from('two_factor_auth')
      .update({
        is_enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId);

    // Log successful attempt
    await supabase
      .from('two_factor_attempts')
      .insert({
        user_id: req.userId,
        success: true,
      });

    res.json({
      success: true,
      backupCodes,
    });
  } catch (error: any) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * Disable 2FA
 */
router.post('/disable', authenticate, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body; // Require password confirmation

    // TODO: Verify password with Supabase Auth
    // For now, just disable

    await supabase
      .from('two_factor_auth')
      .update({
        is_enabled: false,
        backup_codes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId);

    res.json({ message: '2FA disabled successfully' });
  } catch (error: any) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * Get backup codes
 */
router.get('/backup-codes', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('backup_codes')
      .eq('user_id', req.userId)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '2FA not enabled' });
    }

    res.json({
      backupCodes: data.backup_codes || [],
    });
  } catch (error: any) {
    console.error('Get backup codes error:', error);
    res.status(500).json({ error: 'Failed to get backup codes' });
  }
});

/**
 * Verify 2FA token (for login)
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'User ID and token are required' });
    }

    // Get secret
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('secret, backup_codes')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: '2FA not enabled for this user' });
    }

    const { secret, backup_codes } = data;

    // Check if it's a backup code
    const isBackupCode = backup_codes && backup_codes.includes(token);

    if (isBackupCode) {
      // Remove used backup code
      const updatedCodes = backup_codes.filter((code: string) => code !== token);
      await supabase
        .from('two_factor_auth')
        .update({ backup_codes: updatedCodes })
        .eq('user_id', userId);

      return res.json({ verified: true, usedBackupCode: true });
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    // Log attempt
    await supabase
      .from('two_factor_attempts')
      .insert({
        user_id: userId,
        success: verified,
        ip_address: req.ip,
      });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    res.json({ verified: true });
  } catch (error: any) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;
