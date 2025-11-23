import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = express.Router();

/**
 * Get 2FA status
 */
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT is_enabled FROM two_factor_auth WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      isEnabled: result.rows[0]?.is_enabled || false,
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
    const existingResult = await pool.query(
      'SELECT * FROM two_factor_auth WHERE user_id = $1 AND is_enabled = true',
      [req.userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BLINNO (${req.userId})`,
      issuer: 'BLINNO',
    });

    // Get user email for QR code label
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.userId]
    );
    const userEmail = userResult.rows[0]?.email || req.userId;

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret (not enabled yet)
    await pool.query(
      `INSERT INTO two_factor_auth (user_id, secret, is_enabled)
       VALUES ($1, $2, false)
       ON CONFLICT (user_id) 
       DO UPDATE SET secret = $2, is_enabled = false, updated_at = now()`,
      [req.userId, secret.base32]
    );

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
    const result = await pool.query(
      'SELECT secret FROM two_factor_auth WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: '2FA not set up. Please setup first.' });
    }

    const secret = result.rows[0].secret;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    });

    if (!verified) {
      // Log failed attempt
      await pool.query(
        'INSERT INTO two_factor_attempts (user_id, success) VALUES ($1, false)',
        [req.userId]
      );

      return res.status(400).json({ error: 'Invalid token' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Enable 2FA and store backup codes
    await pool.query(
      `UPDATE two_factor_auth
       SET is_enabled = true,
           backup_codes = $1,
           updated_at = now()
       WHERE user_id = $2`,
      [backupCodes, req.userId]
    );

    // Log successful attempt
    await pool.query(
      'INSERT INTO two_factor_attempts (user_id, success) VALUES ($1, true)',
      [req.userId]
    );

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

    // Verify password
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // TODO: Verify password with bcrypt
    // For now, just disable

    await pool.query(
      `UPDATE two_factor_auth
       SET is_enabled = false,
           backup_codes = NULL,
           updated_at = now()
       WHERE user_id = $1`,
      [req.userId]
    );

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
    const result = await pool.query(
      'SELECT backup_codes FROM two_factor_auth WHERE user_id = $1 AND is_enabled = true',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '2FA not enabled' });
    }

    res.json({
      backupCodes: result.rows[0].backup_codes || [],
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
    const result = await pool.query(
      'SELECT secret, backup_codes FROM two_factor_auth WHERE user_id = $1 AND is_enabled = true',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: '2FA not enabled for this user' });
    }

    const { secret, backup_codes } = result.rows[0];

    // Check if it's a backup code
    const isBackupCode = backup_codes && backup_codes.includes(token);

    if (isBackupCode) {
      // Remove used backup code
      const updatedCodes = backup_codes.filter((code: string) => code !== token);
      await pool.query(
        'UPDATE two_factor_auth SET backup_codes = $1 WHERE user_id = $2',
        [updatedCodes, userId]
      );

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
    await pool.query(
      'INSERT INTO two_factor_attempts (user_id, success, ip_address) VALUES ($1, $2, $3)',
      [userId, verified, req.ip]
    );

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

