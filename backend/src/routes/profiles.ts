import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, uploadToSupabaseStorage } from '../middleware/upload.js';
import { userPreferences } from '../services/userPreferences.js';

const router = express.Router();

// Get profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user from auth.users (Supabase)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('currency, language, country')
      .eq('user_id', userId)
      .single();
    
    // Combine data
    const result = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      ...(profile || {}),
      currency: preferences?.currency || null,
      language: preferences?.language || null,
      country: preferences?.country || null,
    };
    
    res.json(result);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get current user's profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get user from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);
    
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.userId)
      .single();
    
    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('currency, language, country')
      .eq('user_id', req.userId)
      .single();
    
    // Combine data
    const result = {
      id: authUser?.user.id || req.userId,
      email: authUser?.user.email || null,
      created_at: authUser?.user.created_at || null,
      ...(profile || {}),
      currency: preferences?.currency || null,
      language: preferences?.language || null,
      country: preferences?.country || null,
    };
    
    res.json(result);
  } catch (error: any) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/me', authenticate, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const {
      displayName,
      bio,
      location,
      website,
      socialLinks,
      phone,
      isPublic,
      currency,
      language,
      country
    } = req.body;
    
    let avatarUrl = null;
    if (req.file) {
      avatarUrl = await uploadToSupabaseStorage(req.file, 'avatars', req.userId);
    }
    
    // Prepare profile data
    const profileData: any = {
      user_id: req.userId,
      updated_at: new Date().toISOString(),
    };
    
    if (displayName !== undefined) profileData.display_name = displayName;
    if (bio !== undefined) profileData.bio = bio;
    if (location !== undefined) profileData.location = location;
    if (website !== undefined) profileData.website = website;
    if (socialLinks !== undefined) profileData.social_media = socialLinks ? (typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks) : null;
    if (phone !== undefined) profileData.phone = phone;
    if (isPublic !== undefined) profileData.is_public = isPublic === 'true' || isPublic === true;
    if (avatarUrl !== null) profileData.avatar_url = avatarUrl;
    
    // Upsert profile
    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (profileError) {
      console.error('Profile update error:', profileError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    
    // Update user preferences if provided
    if (currency || language || country) {
      await userPreferences.setUserPreferences(req.userId, {
        currency: currency || undefined,
        language: language || undefined,
        country: country || undefined
      });
    }
    
    // Get updated profile with preferences
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('currency, language, country')
      .eq('user_id', req.userId)
      .single();
    
    const result = {
      id: authUser?.user.id || req.userId,
      email: authUser?.user.email || null,
      created_at: authUser?.user.created_at || null,
      ...(profileResult || {}),
      currency: preferences?.currency || null,
      language: preferences?.language || null,
      country: preferences?.country || null,
    };
    
    res.json(result);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;