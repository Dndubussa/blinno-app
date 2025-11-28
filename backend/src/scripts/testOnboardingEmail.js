/**
 * Test script to verify onboarding emails are sent after user signup
 * 
 * Usage:
 *   node backend/src/scripts/testOnboardingEmail.js
 * 
 * This script will:
 * 1. Check if the welcome email template exists in the database
 * 2. Test the email sending functionality
 * 3. Optionally test the full signup flow
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Try to import from compiled dist first, then source
let supabase, sendWelcomeEmail;
try {
  const supabaseModule = await import('../../dist/config/supabase.js');
  const emailModule = await import('../../dist/services/emailService.js');
  supabase = supabaseModule.supabase;
  sendWelcomeEmail = emailModule.sendWelcomeEmail;
} catch (err) {
  try {
    const supabaseModule = await import('../config/supabase.js');
    const emailModule = await import('../services/emailService.js');
    supabase = supabaseModule.supabase;
    sendWelcomeEmail = emailModule.sendWelcomeEmail;
  } catch (err2) {
    console.error('Could not import modules. Make sure backend is built: npm run build:backend');
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Test email address (change this to your test email)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_USER_NAME = 'Test User';

async function checkEmailTemplate() {
  console.log('\n📧 Checking email template in database...\n');
  
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', 'welcome')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Error fetching template:', error.message);
      return false;
    }

    if (!template) {
      console.error('❌ Welcome email template not found in database!');
      console.log('\n💡 To fix this, run:');
      console.log('   node backend/src/scripts/seedEmailTemplatesSupabase.js');
      return false;
    }

    console.log('✅ Welcome email template found!');
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Category: ${template.category}`);
    console.log(`   HTML Content: ${template.body_html ? `${template.body_html.length} characters` : 'Missing'}`);
    console.log(`   Text Content: ${template.body_text ? `${template.body_text.length} characters` : 'Missing'}`);
    console.log(`   Variables: ${JSON.stringify(template.variables)}`);
    
    // Check if template has actual content (not just placeholder)
    if (!template.body_html || template.body_html.includes('<!-- Welcome email template -->')) {
      console.warn('\n⚠️  Warning: Template appears to have placeholder content!');
      console.log('   Run the seed script to load actual HTML content:');
      console.log('   node backend/src/scripts/seedEmailTemplatesSupabase.js');
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking template:', error);
    return false;
  }
}

async function checkEmailConfiguration() {
  console.log('\n⚙️  Checking email configuration...\n');
  
  const requiredEnvVars = [
    'RESEND_API_KEY',
    'RESEND_ONBOARDING_EMAIL',
  ];

  const missing = [];
  const configured = [];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      configured.push(envVar);
      if (envVar === 'RESEND_API_KEY') {
        console.log(`✅ ${envVar}: ${process.env[envVar].substring(0, 10)}...`);
      } else {
        console.log(`✅ ${envVar}: ${process.env[envVar]}`);
      }
    } else {
      missing.push(envVar);
      console.log(`❌ ${envVar}: Not set`);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables!');
    console.log('\n💡 Add these to your .env file:');
    missing.forEach(envVar => {
      console.log(`   ${envVar}=your_value_here`);
    });
    return false;
  }

  return true;
}

async function testEmailSending() {
  console.log('\n📨 Testing email sending...\n');
  
  try {
    console.log(`Sending test email to: ${TEST_EMAIL}`);
    console.log('   (Change TEST_EMAIL in .env or pass as environment variable)\n');
    
    const result = await sendWelcomeEmail(TEST_EMAIL, TEST_USER_NAME);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      console.log(`\n📬 Check your inbox at: ${TEST_EMAIL}`);
      console.log('   (Also check spam folder if not received)');
      return true;
    } else {
      console.error('❌ Failed to send email:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

async function checkEmailLogs() {
  console.log('\n📊 Checking recent email logs...\n');
  
  try {
    const { data: logs, error } = await supabase
      .from('email_template_logs')
      .select('*')
      .eq('template_name', 'welcome')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.warn('⚠️  Could not fetch email logs:', error.message);
      console.log('   (This is okay if the table doesn\'t exist yet)');
      return;
    }

    if (!logs || logs.length === 0) {
      console.log('ℹ️  No email logs found yet.');
      return;
    }

    console.log(`Found ${logs.length} recent welcome email(s):\n`);
    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.recipient_email}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Sent: ${new Date(log.created_at).toLocaleString()}`);
      if (log.error_message) {
        console.log(`   Error: ${log.error_message}`);
      }
      console.log('');
    });
  } catch (error) {
    console.warn('⚠️  Could not check email logs:', error.message);
  }
}

async function testSignupFlow() {
  console.log('\n🧪 Testing full signup flow...\n');
  console.log('This would test the actual signup endpoint.');
  console.log('To test manually:');
  console.log('1. Go to your app\'s signup page');
  console.log('2. Create a new account');
  console.log('3. Check the email inbox for the welcome email');
  console.log('\nOr use curl:');
  console.log(`curl -X POST ${process.env.APP_URL || 'http://localhost:3001'}/api/auth/register \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"email":"test@example.com","password":"Test123!","displayName":"Test User","role":"user","termsAccepted":true}\'');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BLINNO - Onboarding Email Test');
  console.log('═══════════════════════════════════════════════════════════');

  const results = {
    template: false,
    config: false,
    email: false,
  };

  // Step 1: Check email template
  results.template = await checkEmailTemplate();
  
  // Step 2: Check configuration
  results.config = await checkEmailConfiguration();
  
  // Step 3: Check email logs
  await checkEmailLogs();
  
  // Step 4: Test email sending (only if template and config are OK)
  if (results.template && results.config) {
    console.log('\n⚠️  About to send a test email...');
    console.log(`   Recipient: ${TEST_EMAIL}`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    results.email = await testEmailSending();
  } else {
    console.log('\n⏭️  Skipping email test due to configuration issues.');
  }

  // Step 5: Show signup flow instructions
  await testSignupFlow();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Email Template: ${results.template ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Configuration:  ${results.config ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Email Sending:  ${results.email ? '✅ OK' : results.template && results.config ? '❌ FAILED' : '⏭️  SKIPPED'}`);
  
  if (results.template && results.config && results.email) {
    console.log('\n✅ All tests passed! Onboarding emails should work correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  process.exit(results.template && results.config && results.email ? 0 : 1);
}

// Run the test
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

