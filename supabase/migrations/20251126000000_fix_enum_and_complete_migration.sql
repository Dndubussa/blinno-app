-- ============================================
-- Fix for Enum Already Exists Error and Complete Migration
-- ============================================
-- This migration fixes the enum issue and completes the Supabase migration
-- ============================================

-- First, let's check if the app_role enum exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator');
  END IF;
END $$;

-- Add all additional enum values safely
DO $$ 
BEGIN
  -- Add journalist role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'journalist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'journalist';
  END IF;
  
  -- Add artisan role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'artisan' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'artisan';
  END IF;
  
  -- Add employer role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employer';
  END IF;
  
  -- Add event_organizer role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'event_organizer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'event_organizer';
  END IF;
  
  -- Add moderator role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
  
  -- Add musician role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'musician' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'musician';
  END IF;
END $$;

-- Verify all enum values exist
SELECT enumlabel as role_name 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumsortorder;

-- Ensure the profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE,
    display_name TEXT,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    role app_role DEFAULT 'user'::app_role,
    roles TEXT[] DEFAULT ARRAY['user']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create music_tracks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.music_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    duration INTEGER,
    file_path TEXT,
    cover_image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    price NUMERIC(10,2) DEFAULT 0.00,
    creator_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0
);

-- Create music_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.music_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    track_id UUID REFERENCES music_tracks ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    UNIQUE(track_id, user_id)
);

-- Create music_plays table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.music_plays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    track_id UUID REFERENCES music_tracks ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_creator_id ON music_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_genre ON music_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_music_tracks_published ON music_tracks(is_published);
CREATE INDEX IF NOT EXISTS idx_music_likes_track_id ON music_likes(track_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_user_id ON music_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_music_plays_track_id ON music_plays(track_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_plays ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create policies for user_roles
CREATE POLICY "User roles are viewable by everyone" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own roles" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::app_role
));

-- Create policies for music_tracks
CREATE POLICY "Music tracks are viewable by everyone when published" ON music_tracks FOR SELECT USING (is_published = true);
CREATE POLICY "Users can view their own tracks" ON music_tracks FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Musician can create tracks" ON music_tracks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND 'musician' = ANY(roles)
  )
);
CREATE POLICY "Musician can update their own tracks" ON music_tracks FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Musician can delete their own tracks" ON music_tracks FOR DELETE USING (auth.uid() = creator_id);

-- Create policies for music_likes
CREATE POLICY "Music likes are viewable by everyone" ON music_likes FOR SELECT USING (true);
CREATE POLICY "Users can like tracks" ON music_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their likes" ON music_likes FOR DELETE USING (auth.uid() = user_id);

-- Create policies for music_plays
CREATE POLICY "Music plays are viewable by admins" ON music_plays FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::app_role
  )
);
CREATE POLICY "Musician can view plays of their tracks" ON music_plays FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM music_tracks mt WHERE mt.id = track_id AND mt.creator_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE profiles TO anon, authenticated;
GRANT ALL ON TABLE user_roles TO anon, authenticated;
GRANT ALL ON TABLE music_tracks TO anon, authenticated;
GRANT ALL ON TABLE music_likes TO anon, authenticated;
GRANT ALL ON TABLE music_plays TO anon, authenticated;
GRANT USAGE ON TYPE app_role TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION gen_random_uuid() TO anon, authenticated;