import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';
import { supabase, supabaseAdmin } from '../config/supabase';

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock Supabase client
jest.mock('../../config/supabase', () => {
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      resend: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    update: jest.fn().mockResolvedValue({ data: [], error: null }),
    delete: jest.fn().mockResolvedValue({ data: [], error: null }),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase,
  };
});

// Mock the sendWelcomeEmail function
jest.mock('../services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Email Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and redirect to auth page when email is not verified', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        role: 'user'
      };

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: null // Email not verified
          },
          session: null
        },
        error: null
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);

      const mockProfileResponse = {
        data: {
          user_id: 'user-id-123',
          email: 'test@example.com',
          display_name: 'Test User',
          roles: ['user']
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: [{ user_id: 'user-id-123' }], error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(mockProfileResponse)
        })
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUserData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('user-id-123');
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should register a new user and redirect to dashboard when email is already verified', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        role: 'user'
      };

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: '2023-01-01T00:00:00Z' // Email already verified
          },
          session: null
        },
        error: null
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);

      const mockProfileResponse = {
        data: {
          user_id: 'user-id-123',
          email: 'test@example.com',
          display_name: 'Test User',
          roles: ['user']
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: [{ user_id: 'user-id-123' }], error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(mockProfileResponse)
        })
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUserData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('user-id-123');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user and redirect to auth page when email is not verified', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: null // Email not verified
          },
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token'
          }
        },
        error: null
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(mockLoginData)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('user-id-123');
    });

    it('should login user and redirect to dashboard when email is verified', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: '2023-01-01T00:00:00Z' // Email verified
          },
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token'
          }
        },
        error: null
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(mockLoginData)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('user-id-123');
    });
  });

  describe('Email Verification Check', () => {
    it('should check if user email is verified', async () => {
      const mockUserResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: '2023-01-01T00:00:00Z' // Email verified
          }
        },
        error: null
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockUserResponse);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.email_verified).toBe(true);
    });

    it('should check if user email is not verified', async () => {
      const mockUserResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com',
            email_confirmed_at: null // Email not verified
          }
        },
        error: null
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockUserResponse);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.email_verified).toBe(false);
    });
  });
});