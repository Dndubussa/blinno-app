import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  userRoles?: string[];
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Verify user exists
    const result = await pool.query(
      'SELECT id, email, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = decoded.userId;
    req.user = result.rows[0];

    // Get user roles
    const rolesResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [decoded.userId]
    );
    req.userRoles = rolesResult.rows.map((row) => row.role);

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Check if user has any of the required roles
      const placeholders = roles.map((_, index) => `$${index + 2}`).join(', ');
      const query = `SELECT role FROM user_roles 
                     WHERE user_id = $1 AND role IN (${placeholders})`;
      
      const result = await pool.query(query, [req.userId, ...roles]);

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error: any) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Error checking permissions', details: error.message });
    }
  };
};

