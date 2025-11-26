import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(-1);
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.log('⚠️ Supabase client initialized but not yet connected');
    } else {
      console.log('✅ Supabase client initialized successfully');
    }
  })
  .catch((error) => {
    console.log('⚠️ Supabase client initialized but not yet connected');
  });

export default supabase;
export default supabase;