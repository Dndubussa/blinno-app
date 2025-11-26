#!/usr/bin/env node

/**
 * Script to run Supabase migrations
 * This script helps apply migrations in the correct order
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MIGRATIONS_DIR = './supabase/migrations';
const PROJECT_ID = 'voxovqhyptopundvbtkc'; // From your config.toml

console.log('🔍 Checking Supabase CLI installation...');
try {
  execSync('supabase --version', { stdio: 'pipe' });
  console.log('✅ Supabase CLI is installed');
} catch (error) {
  console.error('❌ Supabase CLI is not installed. Please install it first:');
  console.error('   npm install -g supabase');
  process.exit(1);
}

console.log('📂 Reading migration files...');
const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.error('❌ No migration files found');
  process.exit(1);
}

console.log(`📋 Found ${migrationFiles.length} migration files:`);
migrationFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file}`);
});

// Check if we're linked to a project
try {
  execSync('supabase link --project-ref ' + PROJECT_ID, { stdio: 'pipe' });
  console.log('🔗 Linked to Supabase project');
} catch (error) {
  console.log('⚠️  Not linked to a Supabase project. You may need to link manually.');
  console.log('   Run: supabase link --project-ref ' + PROJECT_ID);
}

console.log('\n🚀 Starting migration process...');
console.log('⚠️  Make sure you have set your Supabase credentials in the environment variables:');
console.log('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n');

// Run the fix migration first if it exists
const fixMigration = migrationFiles.find(file => file.includes('fix_enum'));
if (fixMigration) {
  console.log(`🔧 Running fix migration: ${fixMigration}`);
  try {
    execSync(`supabase migration up --file ${path.join(MIGRATIONS_DIR, fixMigration)}`, { 
      stdio: 'inherit' 
    });
    console.log('✅ Fix migration completed successfully\n');
  } catch (error) {
    console.error('❌ Fix migration failed:', error.message);
    process.exit(1);
  }
}

console.log('🔄 Running all migrations...');
try {
  execSync('supabase migration up', { stdio: 'inherit' });
  console.log('\n🎉 All migrations completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update your .env file with Supabase credentials');
  console.log('   2. Test authentication and data access');
  console.log('   3. Verify all existing functionality works as expected');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}