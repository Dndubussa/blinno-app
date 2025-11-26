/**
 * Email Service Test Script
 * Tests all configured email addresses and functionality
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
  import('dotenv').then(dotenv => {
    dotenv.config({ path: envPath });
  });
} else {
  console.log('⚠️  No .env file found. Using environment variables from system.');
}

// Import email service functions
let emailService;
try {
  emailService = await import('../src/services/emailService.js');
} catch (error) {
  console.log('⚠️  Could not import email service. Make sure the backend is built first.');
  console.log('   Run "npm run build" in the backend directory first.');
  process.exit(1);
}

const { 
  sendEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendNotificationEmail,
  getEmailAddresses,
  getSenderEmail
} = emailService;

// Test configuration
const TEST_RECIPIENT = process.env.TEST_EMAIL || 'test@example.com';
const TEST_API_KEY = process.env.RESEND_API_KEY;

console.log('📧 Email Service Test');
console.log('=====================');

// Check if API key is configured
if (!TEST_API_KEY) {
  console.log('❌ RESEND_API_KEY not set in environment variables');
  console.log('   Please set RESEND_API_KEY in your .env file');
  process.exit(1);
}

console.log('✅ RESEND_API_KEY is configured');

// Display configured email addresses
console.log('\n📋 Configured Email Addresses:');
const emailAddresses = getEmailAddresses();
for (const [type, address] of Object.entries(emailAddresses)) {
  console.log(`   ${type}: ${address}`);
}

// Test functions
async function runTests() {
  console.log('\n🧪 Running Email Tests...\n');
  
  try {
    // Test 1: Basic email with default sender
    console.log('1. Testing basic email with default sender...');
    const result1 = await sendEmail({
      to: TEST_RECIPIENT,
      subject: 'Test Email - Default Sender',
      html: '<h1>Test Email</h1><p>This is a test email from the default sender.</p>',
    });
    
    if (result1.success) {
      console.log('   ✅ Success - Default sender email sent');
    } else {
      console.log('   ❌ Failed - Default sender email:', result1.error);
    }
    
    // Test 2: Welcome email (uses onboarding sender)
    console.log('\n2. Testing welcome email (onboarding sender)...');
    const result2 = await sendWelcomeEmail(TEST_RECIPIENT, 'Test User');
    
    if (result2.success) {
      console.log('   ✅ Success - Welcome email sent');
    } else {
      console.log('   ❌ Failed - Welcome email:', result2.error);
    }
    
    // Test 3: Password reset email (uses security sender)
    console.log('\n3. Testing password reset email (security sender)...');
    const result3 = await sendPasswordResetEmail(TEST_RECIPIENT, 'test-reset-token');
    
    if (result3.success) {
      console.log('   ✅ Success - Password reset email sent');
    } else {
      console.log('   ❌ Failed - Password reset email:', result3.error);
    }
    
    // Test 4: Notification email (uses support sender)
    console.log('\n4. Testing notification email (support sender)...');
    const result4 = await sendNotificationEmail(
      TEST_RECIPIENT,
      'Test Notification',
      'This is a test notification message.',
      'https://www.blinno.app'
    );
    
    if (result4.success) {
      console.log('   ✅ Success - Notification email sent');
    } else {
      console.log('   ❌ Failed - Notification email:', result4.error);
    }
    
    // Test 5: Custom email with specific sender
    console.log('\n5. Testing custom email with finance sender...');
    const result5 = await sendEmail({
      to: TEST_RECIPIENT,
      subject: 'Test Email - Finance Department',
      html: '<h1>Finance Test</h1><p>This email was sent from the finance department.</p>',
      emailType: 'finance'
    });
    
    if (result5.success) {
      console.log('   ✅ Success - Finance email sent');
    } else {
      console.log('   ❌ Failed - Finance email:', result5.error);
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check your email inbox for test messages');
    console.log('   2. Verify sender addresses match expected values');
    console.log('   3. Check Resend dashboard for delivery status');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`📧 Sending test emails to: ${TEST_RECIPIENT}`);
  console.log(`🔑 Using API key: ${TEST_API_KEY.substring(0, 7)}...${TEST_API_KEY.substring(TEST_API_KEY.length - 4)}`);
  
  // Wait a bit for dotenv to load
  setTimeout(() => {
    runTests();
  }, 100);
}

export { runTests };