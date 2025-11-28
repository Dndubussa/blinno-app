/**
 * SMTP Configuration Test Script
 * 
 * This script helps diagnose SMTP configuration issues by:
 * 1. Checking if Resend API key is valid format
 * 2. Testing Resend API connection
 * 3. Verifying Supabase SMTP configuration (via logs)
 * 
 * Usage:
 *   node backend/src/scripts/testSMTPConfig.js
 */

import dotenv from 'dotenv';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/.env' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSMTPConfig() {
  console.log('🔍 SMTP Configuration Diagnostic Tool\n');
  console.log('=' .repeat(50));

  // Test 1: Check API Key Format
  console.log('\n📋 Test 1: Resend API Key Format');
  console.log('-'.repeat(50));
  
  if (!RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY is not set in environment variables');
    console.log('   Add it to backend/.env file');
    return;
  }

  console.log(`✅ RESEND_API_KEY is set`);
  console.log(`   Key: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 5)}`);
  
  if (!RESEND_API_KEY.startsWith('re_')) {
    console.log('⚠️  WARNING: Resend API key should start with "re_"');
    console.log('   Current key format: ' + RESEND_API_KEY.substring(0, 10) + '...');
    console.log('   Expected format: re_xxxxxxxxxxxxxxxxxxxxx');
    console.log('   Please check your Resend dashboard and create a new API key');
  } else {
    console.log('✅ API key format is correct (starts with "re_")');
  }

  // Test 2: Test Resend API Connection
  console.log('\n📧 Test 2: Resend API Connection');
  console.log('-'.repeat(50));
  
  try {
    const resend = new Resend(RESEND_API_KEY);
    
    // Try to get domains (this tests API key validity)
    const domains = await resend.domains.list();
    console.log('✅ Resend API connection successful');
    console.log(`   Found ${domains.data?.length || 0} verified domain(s)`);
    
    if (domains.data && domains.data.length > 0) {
      console.log('   Verified domains:');
      domains.data.forEach(domain => {
        console.log(`     - ${domain.name} (${domain.status})`);
      });
    } else {
      console.log('⚠️  No verified domains found');
      console.log('   You can use onboarding@resend.dev for testing');
    }
  } catch (error) {
    console.log('❌ Resend API connection failed');
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('API key')) {
      console.log('   This suggests the API key is invalid or expired');
      console.log('   Please create a new API key in Resend dashboard');
    }
  }

  // Test 3: Check Supabase Configuration
  console.log('\n🔐 Test 3: Supabase Configuration');
  console.log('-'.repeat(50));
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Supabase credentials not found');
    console.log('   Cannot verify SMTP configuration in Supabase');
    console.log('   Please check Supabase Dashboard manually:');
    console.log('   Project Settings → Authentication → SMTP Settings');
  } else {
    console.log('✅ Supabase credentials found');
    console.log('   ⚠️  Note: SMTP settings must be configured in Supabase Dashboard');
    console.log('   Go to: Project Settings → Authentication → SMTP Settings');
    console.log('   Required settings:');
    console.log('     - SMTP Host: smtp.resend.com');
    console.log('     - SMTP Port: 465 (SSL) or 587 (TLS)');
    console.log('     - SMTP Username: resend');
    console.log('     - SMTP Password: ' + RESEND_API_KEY.substring(0, 10) + '...');
    console.log('     - Sender Email: Your verified Resend email');
  }

  // Test 4: Send Test Email (if API key is valid)
  console.log('\n📨 Test 4: Send Test Email');
  console.log('-'.repeat(50));
  
  if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`   Attempting to send test email to: ${testEmail}`);
    console.log('   (Set TEST_EMAIL env var to test with your email)');
    
    try {
      const resend = new Resend(RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'BLINNO <onboarding@resend.dev>';
      
      const result = await resend.emails.send({
        from: fromEmail,
        to: testEmail,
        subject: 'SMTP Configuration Test - BLINNO',
        html: `
          <h1>SMTP Test Email</h1>
          <p>If you received this email, your Resend API is working correctly!</p>
          <p>However, Supabase SMTP must still be configured in the dashboard.</p>
        `,
      });

      if (result.data) {
        console.log('✅ Test email sent successfully via Resend API');
        console.log(`   Email ID: ${result.data.id}`);
        console.log('   Check your inbox (and spam folder)');
      }
    } catch (error) {
      console.log('❌ Failed to send test email');
      console.log(`   Error: ${error.message}`);
    }
  } else {
    console.log('⚠️  Skipping test email (API key format invalid)');
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('='.repeat(50));
  console.log('\n✅ Next Steps:');
  console.log('1. If API key doesn\'t start with "re_", create a new one in Resend dashboard');
  console.log('2. Configure SMTP in Supabase Dashboard:');
  console.log('   - Project Settings → Authentication → SMTP Settings');
  console.log('   - Enable Custom SMTP');
  console.log('   - Use the settings listed above');
  console.log('3. Fix email template error in Supabase:');
  console.log('   - Project Settings → Authentication → Email Templates');
  console.log('   - Remove or fix {{user_name}} variable');
  console.log('4. Test signup again and check logs');
  console.log('\n📚 See SMTP_TROUBLESHOOTING.md for detailed instructions\n');
}

testSMTPConfig().catch(error => {
  console.error('❌ Diagnostic script failed:', error);
  process.exit(1);
});

