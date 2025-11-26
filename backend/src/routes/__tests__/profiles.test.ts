import request from 'supertest';
import express from 'express';
import profilesRoutes from '../profiles';
import { supabase } from '../../config/supabase';

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/profiles', profilesRoutes);

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

// Mock upload middleware
jest.mock('../../middleware/upload', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => {
      next();
    }
  },
  uploadToSupabaseStorage: jest.fn().mockResolvedValue('https://example.com/avatar.jpg')
}));

// Mock userPreferences service
jest.mock('../../services/userPreferences', () => ({
  userPreferences: {
    setUserPreferences: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Profiles Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profiles/me', () => {
    it('should get the current user profile', async () => {
      const mockAuthUser = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        }
      };

      const mockProfile = {
        id: 'profile-id',
        user_id: 'test-user-id',
        display_name: 'Test User',
        bio: 'Test bio',
        location: 'Test Location'
      };

      const mockPreferences = {
        currency: 'TZS',
        language: 'en',
        country: 'TZ'
      };

      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValueOnce({ data: mockAuthUser, error: null });
      (supabase.from('').select('').eq('').single as jest.Mock)
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockPreferences, error: null });

      const response = await request(app)
        .get('/api/profiles/me')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('display_name');
      expect(response.body).toHaveProperty('currency');
      expect(supabase.auth.admin.getUserById).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 500 if there is an error fetching the profile', async () => {
      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValueOnce({ data: null, error: new Error('Database error') });

      await request(app)
        .get('/api/profiles/me')
        .expect(500);
    });
  });

  describe('PUT /api/profiles/me', () => {
    it('should update the user profile successfully', async () => {
      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        location: 'Updated Location'
      };

      const mockProfileResult = {
        id: 'profile-id',
        user_id: 'test-user-id',
        display_name: 'Updated Name',
        bio: 'Updated bio',
        location: 'Updated Location',
        updated_at: new Date().toISOString()
      };

      const mockAuthUser = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        }
      };

      const mockPreferences = {
        currency: 'TZS',
        language: 'en',
        country: 'TZ'
      };

      (supabase.from('').upsert().select().single as jest.Mock).mockResolvedValueOnce({ data: mockProfileResult, error: null });
      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValueOnce({ data: mockAuthUser, error: null });
      (supabase.from('').select('').eq('').single as jest.Mock).mockResolvedValueOnce({ data: mockPreferences, error: null });

      const response = await request(app)
        .put('/api/profiles/me')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('display_name', 'Updated Name');
      expect(response.body).toHaveProperty('bio', 'Updated bio');
      expect(supabase.from('').upsert).toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      // Override the authenticate middleware for this test
      jest.doMock('../../middleware/auth', () => ({
        authenticate: (req: any, res: any, next: any) => {
          return res.status(401).json({ error: 'Authentication required' });
        }
      }));

      // Re-import the routes to apply the mock
      const freshApp = express();
      freshApp.use(express.json());
      const freshRoutes = await import('../profiles');
      freshApp.use('/api/profiles', freshRoutes.default);

      await request(freshApp)
        .put('/api/profiles/me')
        .send({ displayName: 'Test' })
        .expect(401);
    });
  });
});