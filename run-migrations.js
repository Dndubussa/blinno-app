/**
 * Migration Helper Script
 * 
 * This script helps you identify which migrations need to be run.
 * 
 * To actually apply migrations, you have two options:
 * 
 * OPTION 1: Using Supabase Dashboard (Easiest)
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project (project_id: voxovqhyptopundvbtkc)
 * 3. Navigate to SQL Editor
 * 4. Copy and paste each migration file content in order
 * 5. Run each migration one by one
 * 
 * OPTION 2: Using Supabase CLI
 * 1. Install Supabase CLI: https://github.com/supabase/cli#install-the-cli
 *    - Windows: Use Scoop: scoop install supabase
 *    - Or download from: https://github.com/supabase/cli/releases
 * 2. Run: supabase db push
 * 
 * Migration files to apply (in order):
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

async function listMigrations() {
  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (timestamps ensure correct order)
    
    console.log('\n📋 Migration Files (in order):\n');
    sqlFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    console.log(`\n✅ Total: ${sqlFiles.length} migration files\n`);
    console.log('📝 Next Steps:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy each migration file content');
    console.log('   3. Paste and run in order\n');
    
  } catch (error) {
    console.error('Error reading migrations:', error.message);
  }
}

listMigrations();

