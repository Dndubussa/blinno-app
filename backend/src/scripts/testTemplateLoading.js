import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template definitions (matching actual file names)
const templates = [
  {
    name: 'welcome',
    subject: 'Welcome to BLINNO - Discover, Create & Connect'
  },
  {
    name: 'email_confirmation',
    subject: 'Confirm Your BLINNO Email Address'
  },
  {
    name: 'password_reset',
    subject: 'Reset Your BLINNO Password'
  },
  {
    name: 'account_verification',
    subject: 'Verify Your BLINNO Account'
  },
  {
    name: 'invite_user',
    subject: 'You\'ve Been Invited to Join BLINNO'
  },
  {
    name: 'magic_link',
    subject: 'Secure Login Link for BLINNO'
  },
  {
    name: 'change_email',
    subject: 'Confirm Email Change for Your BLINNO Account'
  },
  {
    name: 'reauthentication',
    subject: 'Re-authentication Required for BLINNO Account'
  },
  {
    name: 'order_confirmation',
    subject: 'Order Confirmation - Order #{{order_id}}'
  },
  {
    name: 'payment_confirmation',
    subject: 'Payment Received - {{amount}}'
  },
  {
    name: 'subscription_confirmation',
    subject: 'BLINNO {{plan_name}} Subscription Confirmation'
  },
  {
    name: 'notification',
    subject: '{{notification_title}}'
  }
];

async function testTemplateLoading() {
  console.log('Testing template loading...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const template of templates) {
    try {
      console.log(`Loading ${template.name} template...`);
      
      // Read HTML template
      const htmlPath = path.join(__dirname, '..', 'templates', 'emails', `${template.name}.html`);
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      console.log(`  ✓ HTML template loaded (${htmlContent.length} characters)`);
      
      // Read text template if it exists
      try {
        const textPath = path.join(__dirname, '..', 'templates', 'emails', `${template.name}.txt`);
        const textContent = fs.readFileSync(textPath, 'utf8');
        console.log(`  ✓ Text template loaded (${textContent.length} characters)`);
      } catch (err) {
        console.log(`  - No text template found (optional)`);
      }
      
      successCount++;
      console.log('');
    } catch (error) {
      console.error(`  ✗ Error loading ${template.name}: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log(`Template Loading Results:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log(`\n✓ All email templates loaded successfully!`);
  } else {
    console.log(`\n✗ ${errorCount} template(s) failed to load.`);
    process.exit(1);
  }
}

testTemplateLoading();