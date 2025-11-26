import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

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

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at !== null,
    };

    // Get user roles from Supabase
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!rolesError && rolesData) {
      req.userRoles = rolesData.map((row) => row.role);
    } else {
      req.userRoles = ['user']; // Default role
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Check if user has any of the required roles using Supabase
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.userId)
        .in('role', roles);

      if (error) {
        console.error('Role check error:', error);
        return res.status(500).json({ error: 'Error checking permissions', details: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error: any) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Error checking permissions', details: error.message });
    }
  };
};

