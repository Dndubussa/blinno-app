-- Create music_tracks table
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL,
  duration INTERVAL,
  image_url TEXT,
  audio_url TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'TSh',
  plays_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create music_likes table
CREATE TABLE music_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(track_id, user_id)
);

-- Create music_plays table (for tracking plays)
CREATE TABLE music_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_music_tracks_musician_id ON music_tracks(musician_id);
CREATE INDEX idx_music_tracks_genre ON music_tracks(genre);
CREATE INDEX idx_music_tracks_is_published ON music_tracks(is_published);
CREATE INDEX idx_music_likes_track_id ON music_likes(track_id);
CREATE INDEX idx_music_likes_user_id ON music_likes(user_id);
CREATE INDEX idx_music_plays_track_id ON music_plays(track_id);

-- Create trigger for updated_at
CREATE TRIGGER update_music_tracks_updated_at 
BEFORE UPDATE ON music_tracks 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();