import request from 'supertest';
import express from 'express';
import authRoutes from '../auth';
import { supabase } from '../../config/supabase';

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock the sendWelcomeEmail function
jest.mock('../../services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
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
            created_at: new Date().toISOString()
          },
          session: {
            access_token: 'access-token-123'
          }
        },
        error: null
      };

      const mockProfileResponse = {
        data: {
          id: 'profile-id-123',
          user_id: 'user-id-123',
          display_name: 'Test User'
        },
        error: null
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce(mockAuthResponse);
      (supabase.from('').select('').eq('').single as jest.Mock).mockResolvedValueOnce(mockProfileResponse);

      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUserData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: mockUserData.email.toLowerCase(),
        password: mockUserData.password
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user successfully', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-id-123',
            email: 'test@example.com'
          },
          session: {
            access_token: 'access-token-123'
          }
        },
        error: null
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(mockLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockLoginData.email.toLowerCase(),
        password: mockLoginData.password
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockAuthResponse = {
        data: null,
        error: { message: 'Invalid credentials' }
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

      await request(app)
        .post('/api/auth/login')
        .send(mockLoginData)
        .expect(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const mockEmail = 'test@example.com';
      
      const mockResetResponse = {
        data: {},
        error: null
      };

      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce(mockResetResponse);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: mockEmail })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        mockEmail.toLowerCase(),
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password')
        })
      );
    });
  });
});