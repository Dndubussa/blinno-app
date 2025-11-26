/**
 * Helper utilities to migrate from pool.query() to Supabase client
 * 
 * This file provides helper functions to make the migration easier.
 * Over time, you can replace these with direct Supabase calls.
 */

import { supabase } from '../config/supabase.js';

/**
 * Execute a SELECT query and return rows
 * Similar to pool.query() but using Supabase
 */
export async function querySelect(table: string, select: string = '*', filters?: Record<string, any>) {
  let query = supabase.from(table).select(select);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return { rows: data || [] };
}

/**
 * Execute an INSERT query
 */
export async function queryInsert(table: string, data: Record<string, any>) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { rows: [result] };
}

/**
 * Execute an UPDATE query
 */
export async function queryUpdate(table: string, data: Record<string, any>, filters: Record<string, any>) {
  let query = supabase.from(table).update(data);

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data: result, error } = await query.select();

  if (error) {
    throw error;
  }

  return { rows: result || [] };
}

/**
 * Execute a DELETE query
 */
export async function queryDelete(table: string, filters: Record<string, any>) {
  let query = supabase.from(table).delete();

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { error } = await query;

  if (error) {
    throw error;
  }

  return { rowCount: 1 };
}

/**
 * Execute a raw SQL query (for complex queries that can't be done with Supabase client)
 * Note: This requires using Supabase's RPC functions or direct SQL access
 * For now, this is a placeholder - you'll need to create RPC functions in Supabase
 * for complex queries, or use the service role client with direct SQL
 */
export async function queryRaw(sql: string, params: any[] = []) {
  // For complex queries, you have two options:
  // 1. Create PostgreSQL functions (RPC) in Supabase and call them
  // 2. Use Supabase's direct SQL access (requires service role)
  
  // This is a simplified version - you may need to adjust based on your needs
  console.warn('Raw SQL queries should be converted to Supabase client calls or RPC functions');
  
  // For now, throw an error to force migration
  throw new Error('Raw SQL queries need to be migrated. Use Supabase client methods or create RPC functions.');
}

