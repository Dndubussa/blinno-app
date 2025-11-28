/**
 * Test Marketing Email Script
 * 
 * Usage:
 *   node backend/src/scripts/testMarketingEmail.js
 * 
 * Environment variables:
 *   ADMIN_TOKEN - Admin authentication token
 *   API_URL - API base URL (default: http://localhost:3001/api)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function testMarketingEmail() {
  console.log('🧪 Testing Marketing Email System\n');
  console.log('='.repeat(50));

  if (!ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN environment variable is required');
    console.error('   Set it in your .env file: ADMIN_TOKEN=your-token');
    process.exit(1);
  }

  // Test 1: Get statistics
  console.log('\n📊 Test 1: Get Marketing Statistics');
  console.log('-'.repeat(50));
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/marketing/stats`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
    });

    if (!statsResponse.ok) {
      throw new Error(`HTTP ${statsResponse.status}`);
    }

    const stats = await statsResponse.json();
    console.log('✅ Statistics retrieved:');
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Creators: ${stats.creators}`);
    console.log(`   Regular Users: ${stats.regularUsers}`);
    console.log('\n   By Role:');
    Object.entries(stats.byRole || {}).forEach(([role, count]) => {
      console.log(`     ${role}: ${count}`);
    });
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
  }

  // Test 2: Send test email (test mode)
  console.log('\n📧 Test 2: Send Test Marketing Email');
  console.log('-'.repeat(50));
  try {
    const sendResponse = await fetch(`${API_BASE_URL}/marketing/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        subject: 'Test Marketing Email - BLINNO',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>Hello {{userName}}!</h1>
              <p>This is a test marketing email from BLINNO.</p>
              <p>If you received this, the marketing email system is working correctly!</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                This is a test email. You can safely ignore it.
              </p>
            </body>
          </html>
        `,
        text: 'Hello {{userName}}! This is a test marketing email from BLINNO.',
        filters: {
          emailVerified: true,
        },
        batchSize: 10,
        testMode: true, // Only send to first user
      }),
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${sendResponse.status}`);
    }

    const result = await sendResponse.json();
    console.log('✅ Test email sent:');
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Total: ${result.total}`);
    console.log(`   Test Mode: ${result.testMode ? 'YES' : 'NO'}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n   Errors:');
      result.errors.forEach((err: any) => {
        console.log(`     ${err.email}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
  }

  // Test 3: Test unsubscribe endpoint
  console.log('\n🔕 Test 3: Test Unsubscribe Endpoint');
  console.log('-'.repeat(50));
  console.log('⚠️  Note: This requires a valid user email');
  console.log('   To test unsubscribe, use the /unsubscribe endpoint with a real email');

  console.log('\n' + '='.repeat(50));
  console.log('✅ Marketing Email System Tests Completed!');
  console.log('='.repeat(50));
  console.log('\n📝 Next Steps:');
  console.log('   1. Create email templates in the database');
  console.log('   2. Test with testMode: true');
  console.log('   3. Send to a small segment first');
  console.log('   4. Monitor delivery rates');
  console.log('   5. Implement unsubscribe links in emails');
}

testMarketingEmail().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

