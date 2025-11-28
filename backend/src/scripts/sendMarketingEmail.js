/**
 * Script to send marketing emails to registered users
 * 
 * Usage:
 *   node backend/src/scripts/sendMarketingEmail.js
 * 
 * Or with environment variables:
 *   TEST_MODE=true node backend/src/scripts/sendMarketingEmail.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function sendMarketingEmail(options) {
  const url = `${API_BASE_URL}/marketing/send`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function getMarketingStats() {
  const url = `${API_BASE_URL}/marketing/stats`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log('📧 Marketing Email Sender\n');
  console.log('='.repeat(50));

  // Check for admin token
  if (!ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN environment variable is required');
    console.error('   Set it in your .env file or as an environment variable');
    process.exit(1);
  }

  // Get stats first
  try {
    console.log('\n📊 Getting user statistics...');
    const stats = await getMarketingStats();
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Creators: ${stats.creators}`);
    console.log(`   Regular Users: ${stats.regularUsers}`);
    console.log('\n   By Role:');
    Object.entries(stats.byRole || {}).forEach(([role, count]) => {
      console.log(`     ${role}: ${count}`);
    });
  } catch (error) {
    console.error('⚠️  Could not get stats:', error.message);
  }

  // Example: Send a test email
  const testMode = process.env.TEST_MODE === 'true' || process.argv.includes('--test');
  
  console.log('\n' + '='.repeat(50));
  console.log('📤 Sending Marketing Email');
  console.log('='.repeat(50));
  console.log(`   Test Mode: ${testMode ? 'YES' : 'NO'}`);

  const emailOptions = {
    subject: process.env.EMAIL_SUBJECT || 'Welcome to BLINNO - Exciting Updates!',
    html: process.env.EMAIL_HTML || `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Hello {{userName}}!</h1>
          <p>We're excited to share some amazing updates with you!</p>
          <ul>
            <li>New features to help you grow</li>
            <li>Improved dashboard experience</li>
            <li>Better payment processing</li>
          </ul>
          <p>Visit <a href="https://www.blinno.app">www.blinno.app</a> to explore!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            You're receiving this because you're a registered user of BLINNO.
            <a href="https://www.blinno.app/unsubscribe">Unsubscribe</a>
          </p>
        </body>
      </html>
    `,
    text: process.env.EMAIL_TEXT || `
      Hello {{userName}}!
      
      We're excited to share some amazing updates with you!
      
      - New features to help you grow
      - Improved dashboard experience
      - Better payment processing
      
      Visit www.blinno.app to explore!
      
      ---
      You're receiving this because you're a registered user of BLINNO.
      Unsubscribe: https://www.blinno.app/unsubscribe
    `,
    filters: process.env.EMAIL_FILTERS ? JSON.parse(process.env.EMAIL_FILTERS) : {},
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    testMode,
  };

  // If template name is provided, use it instead
  if (process.env.TEMPLATE_NAME) {
    emailOptions.templateName = process.env.TEMPLATE_NAME;
    emailOptions.templateVariables = process.env.TEMPLATE_VARIABLES 
      ? JSON.parse(process.env.TEMPLATE_VARIABLES)
      : {};
    delete emailOptions.html;
    delete emailOptions.text;
    delete emailOptions.subject;
  }

  try {
    const result = await sendMarketingEmail(emailOptions);
    
    console.log('\n✅ Email Campaign Results:');
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Total: ${result.total}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n   Errors (first 10):');
      result.errors.forEach(err => {
        console.log(`     ${err.email}: ${err.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Campaign completed!');
  } catch (error) {
    console.error('\n❌ Failed to send marketing email:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { sendMarketingEmail, getMarketingStats };

