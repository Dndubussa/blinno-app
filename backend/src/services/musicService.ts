/**
 * Music Service
 * Handles music track management for musicians
 */

import { pool } from '../config/database.js';

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
    currency = 'TSh',
    is_published = false,
    tags = []
  } = data;

  const result = await pool.query(
    `INSERT INTO music_tracks (
      musician_id, title, description, genre, duration, 
      image_url, audio_url, price, currency, is_published, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      musician_id, title, description, genre, duration,
      image_url, audio_url, price, currency, is_published, tags
    ]
  );

  return result.rows[0];
}

/**
 * Get all published tracks
 */
export async function getTracks(): Promise<MusicTrack[]> {
  const result = await pool.query(
    `SELECT * FROM music_tracks 
     WHERE is_published = true 
     ORDER BY created_at DESC`
  );

  return result.rows;
}

/**
 * Get a specific track by ID
 */
export async function getTrackById(id: string): Promise<MusicTrack | null> {
  const result = await pool.query(
    'SELECT * FROM music_tracks WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get tracks for a specific musician
 */
export async function getMusicianTracks(musicianId: string): Promise<MusicTrack[]> {
  const result = await pool.query(
    'SELECT * FROM music_tracks WHERE musician_id = $1 ORDER BY created_at DESC',
    [musicianId]
  );

  return result.rows;
}

/**
 * Update a track
 */
export async function updateTrack(id: string, data: UpdateTrackData): Promise<MusicTrack | null> {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE music_tracks 
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete a track
 */
export async function deleteTrack(id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM music_tracks WHERE id = $1',
    [id]
  );

  return (result.rowCount || 0) > 0;
}

/**
 * Get musician stats
 */
export async function getTrackStats(musicianId: string): Promise<any> {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as total_tracks,
      COALESCE(SUM(plays_count), 0) as total_plays,
      COALESCE(SUM(likes_count), 0) as total_likes
    FROM music_tracks 
    WHERE musician_id = $1`,
    [musicianId]
  );

  return result.rows[0];
}

/**
 * Increment play count for a track
 */
export async function incrementPlayCount(trackId: string): Promise<void> {
  await pool.query(
    'UPDATE music_tracks SET plays_count = plays_count + 1 WHERE id = $1',
    [trackId]
  );
}

/**
 * Like a track
 */
export async function likeTrack(trackId: string, userId: string): Promise<boolean> {
  try {
    await pool.query(
      'INSERT INTO music_likes (track_id, user_id) VALUES ($1, $2)',
      [trackId, userId]
    );
    
    // Update likes count
    await pool.query(
      'UPDATE music_tracks SET likes_count = likes_count + 1 WHERE id = $1',
      [trackId]
    );
    
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
  const result = await pool.query(
    'DELETE FROM music_likes WHERE track_id = $1 AND user_id = $2',
    [trackId, userId]
  );
  
  if ((result.rowCount || 0) > 0) {
    // Update likes count
    await pool.query(
      'UPDATE music_tracks SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
      [trackId]
    );
    return true;
  }
  
  return false;
}