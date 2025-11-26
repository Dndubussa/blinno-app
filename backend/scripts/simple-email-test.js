/**
 * Simple Email Configuration Test
 * Tests that Resend is properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env file');
} else {
  console.log('⚠️  No .env file found. Using system environment variables');
}

// Check required environment variables
const requiredVars = [
  'RESEND_API_KEY',
  'RESEND_ONBOARDING_EMAIL',
  'RESEND_SUPPORT_EMAIL',
  'RESEND_FINANCE_EMAIL'
];

const missingVars = [];
const presentVars = [];

console.log('\n🔍 Checking Email Configuration...\n');

for (const varName of requiredVars) {
  if (process.env[varName]) {
    // Mask API key for security
    if (varName === 'RESEND_API_KEY') {
      const maskedKey = `${process.env[varName].substring(0, 7)}...${process.env[varName].substring(process.env[varName].length - 4)}`;
      console.log(`✅ ${varName}: ${maskedKey}`);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
    presentVars.push(varName);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  }
}

console.log('\n' + '='.repeat(60));

if (missingVars.length > 0) {
  console.log('\n❌ Missing required environment variables:');
  for (const varName of missingVars) {
    console.log(`   ${varName}`);
  }
  console.log('\nPlease set these variables in your backend/.env file');
  process.exit(1);
} else {
  console.log('\n✅ All required email configuration variables are set!');
  console.log('\n📋 Configured email addresses:');
  console.log(`   Onboarding: ${process.env.RESEND_ONBOARDING_EMAIL}`);
  console.log(`   Support: ${process.env.RESEND_SUPPORT_EMAIL}`);
  console.log(`   Finance: ${process.env.RESEND_FINANCE_EMAIL}`);
  console.log(`   Orders: ${process.env.RESEND_ORDERS_EMAIL || 'Not set (will use default)'}`);
  console.log(`   Security: ${process.env.RESEND_SECURITY_EMAIL || 'Not set (will use default)'}`);
  
  console.log('\n🎉 Email configuration is ready!');
  console.log('\nTo test actual email sending, run the full email service test:');
  console.log('   npm run build');
  console.log('   npm run test:email');
}