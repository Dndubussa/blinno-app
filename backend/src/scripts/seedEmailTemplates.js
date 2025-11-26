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
    subject: 'Welcome to BLINNO - Discover, Create & Connect',
    category: 'onboarding',
    variables: {
      user_name: 'string',
      dashboard_url: 'string',
      unsubscribe_url: 'string',
      preferences_url: 'string'
    }
  },
  {
    name: 'email_confirmation',
    subject: 'Confirm Your BLINNO Email Address',
    category: 'security',
    variables: {
      user_name: 'string',
      confirmation_url: 'string'
    }
  },
  {
    name: 'password_reset',
    subject: 'Reset Your BLINNO Password',
    category: 'security',
    variables: {
      user_name: 'string',
      reset_url: 'string'
    }
  },
  {
    name: 'account_verification',
    subject: 'Verify Your BLINNO Account',
    category: 'security',
    variables: {
      user_name: 'string',
      verification_url: 'string'
    }
  },
  {
    name: 'invite_user',
    subject: 'You\'ve Been Invited to Join BLINNO',
    category: 'security',
    variables: {
      inviter_name: 'string',
      team_name: 'string',
      role: 'string',
      invite_url: 'string'
    }
  },
  {
    name: 'magic_link',
    subject: 'Secure Login Link for BLINNO',
    category: 'security',
    variables: {
      user_name: 'string',
      magic_link_url: 'string'
    }
  },
  {
    name: 'change_email',
    subject: 'Confirm Email Change for Your BLINNO Account',
    category: 'security',
    variables: {
      user_name: 'string',
      current_email: 'string',
      new_email: 'string',
      request_time: 'string',
      confirmation_url: 'string',
      cancel_url: 'string'
    }
  },
  {
    name: 'reauthentication',
    subject: 'Re-authentication Required for BLINNO Account',
    category: 'security',
    variables: {
      user_name: 'string',
      action_description: 'string',
      timestamp: 'string',
      location: 'string',
      reauth_url: 'string'
    }
  },
  {
    name: 'order_placed',
    subject: 'Order Confirmation - Order #{{order_id}}',
    category: 'order',
    variables: {
      customer_name: 'string',
      order_id: 'string',
      order_date: 'string',
      order_items: 'array',
      order_total: 'string',
      order_url: 'string'
    }
  },
  {
    name: 'payment_received',
    subject: 'Payment Received - {{amount}}',
    category: 'payment',
    variables: {
      customer_name: 'string',
      order_id: 'string',
      payment_date: 'string',
      payment_method: 'string',
      transaction_id: 'string',
      amount: 'string',
      order_url: 'string'
    }
  },
  {
    name: 'subscription_confirmation',
    subject: 'BLINNO {{plan_name}} Subscription Confirmation',
    category: 'subscription',
    variables: {
      user_name: 'string',
      plan_name: 'string',
      billing_cycle: 'string',
      amount: 'string',
      start_date: 'string',
      next_billing_date: 'string',
      payment_method: 'string',
      plan_features: 'array',
      dashboard_url: 'string'
    }
  },
  {
    name: 'notification',
    subject: '{{notification_title}}',
    category: 'notification',
    variables: {
      user_name: 'string',
      notification_title: 'string',
      notification_subtitle: 'string',
      notification_message: 'string',
      action_url: 'string',
      action_text: 'string',
      preferences_url: 'string',
      unsubscribe_url: 'string'
    }
  }
];

async function seedEmailTemplates() {
  console.log('Seeding email templates...');
  
  try {
    for (const template of templates) {
      // Read HTML template
      const htmlPath = path.join(__dirname, '..', 'templates', 'emails', `${template.name}.html`);
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Read text template if it exists
      let textContent = null;
      try {
        const textPath = path.join(__dirname, '..', 'templates', 'emails', `${template.name}.txt`);
        textContent = fs.readFileSync(textPath, 'utf8');
      } catch (err) {
        // Text template doesn't exist, that's okay
        console.log(`No text template found for ${template.name}, using HTML only`);
      }
      
      // Show what would be seeded
      console.log(`Template: ${template.name}`);
      console.log(`  Subject: ${template.subject}`);
      console.log(`  Category: ${template.category}`);
      console.log(`  HTML size: ${htmlContent.length} characters`);
      console.log(`  Text size: ${textContent ? textContent.length + ' characters' : 'None'}`);
      console.log(`  Variables: ${JSON.stringify(template.variables)}`);
      console.log('');
    }
    
    console.log('Email template seeding completed!');
    return true;
  } catch (error) {
    console.error('Error seeding email templates:', error);
    return false;
  }
}

// Run the seed function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running seedEmailTemplates directly...');
  seedEmailTemplates().then(success => {
    if (success) {
      console.log('Seeding completed successfully');
    } else {
      console.log('Seeding failed');
      process.exit(1);
    }
  });
}

export default seedEmailTemplates;
