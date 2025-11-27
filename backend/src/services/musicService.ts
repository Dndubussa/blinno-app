/**
 * Music Service
 * Handles music track management for musicians
 */

import { supabase } from '../config/supabase.js';

export interface MusicTrack {
  id: string;
  musician_id: string;
  title: string;
  description?: string;
  genre: string;
  duration?: string;
  image_url?: string;
  audio_url: string;
  price: number;
  currency: string;
  plays_count: number;
  likes_count: number;
  is_published: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTrackData {
  musician_id: string;
  title: string;
  description?: string;
  genre: string;
  duration?: string;
  image_url?: string;
  audio_url: string;
  price?: number;
  currency?: string;
  is_published?: boolean;
  tags?: string[];
}

export interface UpdateTrackData {
  title?: string;
  description?: string;
  genre?: string;
  duration?: string;
  image_url?: string;
  audio_url?: string;
  price?: number;
  currency?: string;
  is_published?: boolean;
  tags?: string[];
}

/**
 * Create a new music track
 */
export async function createTrack(data: CreateTrackData): Promise<MusicTrack> {
  const {
    musician_id,
    title,
    description,
    genre,
    duration,
    image_url,
    audio_url,
    price = 0,
    currency = 'USD',
    is_published = false,
    tags = []
  } = data;

  const { data: track, error } = await supabase
    .from('music_tracks')
    .insert({
      musician_id,
      title,
      description,
      genre,
      duration,
      image_url,
      audio_url,
      price,
      currency,
      is_published,
      tags
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return track;
}

/**
 * Get all published tracks
 */
export async function getTracks(): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a specific track by ID
 */
export async function getTrackById(id: string): Promise<MusicTrack | null> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get tracks for a specific musician
 */
export async function getMusicianTracks(musicianId: string): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('musician_id', musicianId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a track
 */
export async function updateTrack(id: string, data: UpdateTrackData): Promise<MusicTrack | null> {
  // Remove undefined values
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(updateData).length === 0) {
    throw new Error('No fields to update');
  }

  const { data: track, error } = await supabase
    .from('music_tracks')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return track;
}

/**
 * Delete a track
 */
export async function deleteTrack(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('music_tracks')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Get musician stats
 */
export async function getTrackStats(musicianId: string): Promise<any> {
  // Get count of tracks
  const { count: trackCount, error: countError } = await supabase
    .from('music_tracks')
    .select('*', { count: 'exact' })
    .eq('musician_id', musicianId);

  if (countError) {
    throw countError;
  }

  // Get sum of plays
  const { data: playsData, error: playsError } = await supabase
    .from('music_tracks')
    .select('plays_count')
    .eq('musician_id', musicianId);

  if (playsError) {
    throw playsError;
  }

  const totalPlays = playsData.reduce((sum, track) => sum + (track.plays_count || 0), 0);

  // Get sum of likes
  const { data: likesData, error: likesError } = await supabase
    .from('music_tracks')
    .select('likes_count')
    .eq('musician_id', musicianId);

  if (likesError) {
    throw likesError;
  }

  const totalLikes = likesData.reduce((sum, track) => sum + (track.likes_count || 0), 0);

  return {
    total_tracks: trackCount || 0,
    total_plays: totalPlays,
    total_likes: totalLikes
  };
}

/**
 * Increment play count for a track
 */
export async function incrementPlayCount(trackId: string): Promise<void> {
  // Get current track
  const { data: track, error: fetchError } = await supabase
    .from('music_tracks')
    .select('plays_count')
    .eq('id', trackId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Update plays count
  const { error: updateError } = await supabase
    .from('music_tracks')
    .update({
      plays_count: (track.plays_count || 0) + 1
    })
    .eq('id', trackId);

  if (updateError) {
    throw updateError;
  }
}

/**
 * Like a track
 */
export async function likeTrack(trackId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('music_likes')
      .insert({
        track_id: trackId,
        user_id: userId
      });

    if (error) {
      throw error;
    }
    
    // Get current track
    const { data: track, error: fetchError } = await supabase
      .from('music_tracks')
      .select('likes_count')
      .eq('id', trackId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Update likes count
    await supabase
      .from('music_tracks')
      .update({
        likes_count: (track.likes_count || 0) + 1
      })
      .eq('id', trackId);
    
    return true;
  } catch (error: any) {
    // If unique constraint violation, user already liked the track
    if (error.code === '23505') {
      return false;
    }
    throw error;
  }
}

/**
 * Unlike a track
 */
export async function unlikeTrack(trackId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('music_likes')
    .delete()
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .select();

  if (error) {
    throw error;
  }
  
  if (data && data.length > 0) {
    // Get current track
    const { data: track, error: fetchError } = await supabase
      .from('music_tracks')
      .select('likes_count')
      .eq('id', trackId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Update likes count
    await supabase
      .from('music_tracks')
      .update({
        likes_count: Math.max(0, (track.likes_count || 0) - 1)
      })
      .eq('id', trackId);
    return true;
  }
  
  return false;
}