import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role = 'user' } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, $2, false)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), hashedPassword]
    );

    const userId = userResult.rows[0].id;

    // Create profile
    await pool.query(
      `INSERT INTO profiles (user_id, display_name, is_creator)
       VALUES ($1, $2, $3)`,
      [userId, displayName, ['creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer'].includes(role)]
    );

    // Assign role
    await pool.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId, role]
    );

    // Also assign 'user' role
    await pool.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, 'user')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId]
    );

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    const token = jwt.sign(
      { userId },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.status(201).json({
      user: userResult.rows[0],
      token,
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

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT p.*, u.email, u.email_verified
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [req.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const rolesResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      ...profileResult.rows[0],
      roles: rolesResult.rows.map(r => r.role),
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Google OAuth (placeholder - implement OAuth flow)
router.post('/google', async (req, res) => {
  // TODO: Implement Google OAuth
  res.status(501).json({ error: 'Google OAuth not yet implemented' });
});

export default router;

