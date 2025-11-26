import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to replace variables in template
function replaceVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// Test data for each template
const testData = {
  welcome: {
    user_name: 'John Doe',
    dashboard_url: 'https://www.blinno.app/dashboard',
    unsubscribe_url: 'https://www.blinno.app/unsubscribe',
    preferences_url: 'https://www.blinno.app/preferences'
  },
  email_confirmation: {
    user_name: 'John Doe',
    confirmation_url: 'https://www.blinno.app/confirm-email?token=abc123'
  },
  password_reset: {
    user_name: 'John Doe',
    reset_url: 'https://www.blinno.app/reset-password?token=xyz789'
  },
  account_verification: {
    user_name: 'John Doe',
    verification_url: 'https://www.blinno.app/verify-account?token=def456'
  },
  invite_user: {
    inviter_name: 'Jane Smith',
    team_name: 'Marketing Team',
    role: 'Content Creator',
    invite_url: 'https://www.blinno.app/accept-invite?token=inv789'
  },
  magic_link: {
    user_name: 'John Doe',
    magic_link_url: 'https://www.blinno.app/magic-login?token=mag123'
  },
  change_email: {
    user_name: 'John Doe',
    current_email: 'john.doe@example.com',
    new_email: 'john.new@example.com',
    request_time: '2025-11-26 14:30:00 UTC',
    confirmation_url: 'https://www.blinno.app/confirm-email-change?token=chg456',
    cancel_url: 'https://www.blinno.app/cancel-email-change?token=cnl789'
  },
  reauthentication: {
    user_name: 'John Doe',
    action_description: 'Change password',
    timestamp: '2025-11-26 14:30:00 UTC',
    location: 'Dar es Salaam, Tanzania',
    reauth_url: 'https://www.blinno.app/reauthenticate?token=rea123'
  },
  order_confirmation: {
    customer_name: 'John Doe',
    order_id: 'ORD-12345',
    order_date: '2025-11-26',
    order_items: [
      { name: 'Handmade Basket', quantity: 2, price: '25,000 TZS' },
      { name: 'Tanzanian Coffee', quantity: 1, price: '15,000 TZS' }
    ],
    order_total: '65,000 TZS',
    order_url: 'https://www.blinno.app/orders/ORD-12345'
  },
  payment_confirmation: {
    customer_name: 'John Doe',
    order_id: 'ORD-12345',
    payment_date: '2025-11-26',
    payment_method: 'Mobile Money',
    transaction_id: 'TXN-98765',
    amount: '65,000 TZS',
    order_url: 'https://www.blinno.app/orders/ORD-12345'
  },
  subscription_confirmation: {
    user_name: 'John Doe',
    plan_name: 'Creator',
    billing_cycle: 'Monthly',
    amount: '15,000 TZS',
    start_date: '2025-11-26',
    next_billing_date: '2025-12-26',
    payment_method: 'Credit Card',
    plan_features: [
      'Unlimited listings',
      'Advanced analytics',
      'Priority support',
      'Featured listings'
    ],
    dashboard_url: 'https://www.blinno.app/dashboard'
  },
  notification: {
    user_name: 'John Doe',
    notification_title: 'New Message Received',
    notification_subtitle: 'You have a new message from a buyer',
    notification_message: 'Sarah Johnson sent you a message about your product listing.',
    action_url: 'https://www.blinno.app/messages/MSG-555',
    action_text: 'View Message',
    preferences_url: 'https://www.blinno.app/preferences',
    unsubscribe_url: 'https://www.blinno.app/unsubscribe'
  }
};

// List of template names to test (matching actual file names)
const templateNames = [
  'welcome',
  'email_confirmation',
  'password_reset',
  'account_verification',
  'invite_user',
  'magic_link',
  'change_email',
  'reauthentication',
  'order_confirmation',
  'payment_confirmation',
  'subscription_confirmation',
  'notification'
];

console.log('Testing email templates...\n');

let successCount = 0;
let errorCount = 0;

for (const templateName of templateNames) {
  try {
    console.log(`Testing ${templateName} template...`);
    
    // Read HTML template
    const htmlPath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    console.log(`  ✓ HTML template loaded successfully`);
    
    // Read text template if it exists
    try {
      const textPath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.txt`);
      const textContent = fs.readFileSync(textPath, 'utf8');
      console.log(`  ✓ Text template loaded successfully`);
    } catch (err) {
      console.log(`  - No text template found (optional)`);
    }
    
    // Test variable replacement
    const testDataForTemplate = testData[templateName] || {};
    const processedHtml = replaceVariables(htmlContent, testDataForTemplate);
    console.log(`  ✓ Variable replacement successful`);
    
    // Verify processed content is not empty
    if (processedHtml.length > 0) {
      console.log(`  ✓ Template processing successful\n`);
      successCount++;
    } else {
      console.log(`  ✗ Template processing failed - empty result\n`);
      errorCount++;
    }
  } catch (error) {
    console.log(`  ✗ Error testing ${templateName}: ${error.message}\n`);
    errorCount++;
  }
}

console.log(`\nTest Results:`);
console.log(`  Successful: ${successCount}`);
console.log(`  Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log(`\n✓ All email templates passed testing!`);
} else {
  console.log(`\n✗ ${errorCount} template(s) failed testing.`);
  process.exit(1);
}