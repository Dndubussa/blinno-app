import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

// Create Supabase client with service role key (for backend use)
// This bypasses RLS and should only be used server-side
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Alias for consistency with other files
export const supabaseAdmin = supabase;

// Helper function to get Supabase client for user-specific operations
// Use this when you need to respect RLS policies
export const getSupabaseClient = (accessToken?: string) => {
  if (!accessToken) {
    return supabase; // Fallback to service role client
  }
  
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export default supabase;

