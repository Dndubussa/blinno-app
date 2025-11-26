/**
 * Quick Email Configuration Checker
 * Run this to verify your email environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.join(__dirname, '../.env');

console.log('🔍 Checking Email Configuration...\n');
console.log('='.repeat(60));

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found at:', envPath);
  console.log('\n💡 Create a .env file in the backend directory with:');
  console.log('   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx');
  console.log('   RESEND_ONBOARDING_EMAIL=BLINNO <onboarding@blinno.com>');
  console.log('   ... (see EMAIL_ADDRESSES_SETUP.md for full list)');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

const requiredVars = {
  'RESEND_API_KEY': {
    required: true,
    example: 're_xxxxxxxxxxxxxxxxxxxxx',
    description: 'Resend API Key (REQUIRED)',
  },
};

const optionalVars = {
  'RESEND_FROM_EMAIL': {
    example: 'BLINNO <noreply@blinno.com>',
    description: 'Default email address',
  },
  'RESEND_ONBOARDING_EMAIL': {
    example: 'BLINNO <onboarding@blinno.com>',
    description: 'Onboarding emails',
  },
  'RESEND_SUPPORT_EMAIL': {
    example: 'BLINNO Support <support@blinno.com>',
    description: 'Support emails',
  },
  'RESEND_FINANCE_EMAIL': {
    example: 'BLINNO Finance <finance@blinno.com>',
    description: 'Finance emails',
  },
  'RESEND_ORDERS_EMAIL': {
    example: 'BLINNO Orders <orders@blinno.com>',
    description: 'Order emails',
  },
  'RESEND_SECURITY_EMAIL': {
    example: 'BLINNO Security <security@blinno.com>',
    description: 'Security emails',
  },
  'RESEND_MARKETING_EMAIL': {
    example: 'BLINNO <marketing@blinno.com>',
    description: 'Marketing emails',
  },
  'RESEND_SYSTEM_EMAIL': {
    example: 'BLINNO <system@blinno.com>',
    description: 'System emails',
  },
};

const foundVars = {};
const errors = [];
const warnings = [];

// Parse .env file
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    const [, key, value] = match;
    const cleanValue = value.replace(/^["']|["']$/g, ''); // Remove quotes
    foundVars[key] = cleanValue;
  }
}

// Check required variables
for (const [varName, config] of Object.entries(requiredVars)) {
  if (!foundVars[varName]) {
    errors.push({
      var: varName,
      message: `❌ REQUIRED: ${config.description}`,
      example: config.example,
    });
  } else {
    // Validate format
    if (varName === 'RESEND_API_KEY') {
      if (!foundVars[varName].startsWith('re_')) {
        errors.push({
          var: varName,
          message: '❌ Invalid format: Should start with "re_"',
          example: config.example,
        });
      } else if (foundVars[varName].length < 20) {
        errors.push({
          var: varName,
          message: '❌ Invalid format: API key seems too short',
          example: config.example,
        });
      } else {
        const masked = `${foundVars[varName].substring(0, 7)}...${foundVars[varName].substring(foundVars[varName].length - 4)}`;
        console.log(`✅ ${varName}: ${masked}`);
      }
    }
  }
}

// Check optional variables
for (const [varName, config] of Object.entries(optionalVars)) {
  if (!foundVars[varName]) {
    warnings.push({
      var: varName,
      message: `⚠️  Not set: ${config.description}`,
      example: config.example,
    });
  } else {
    // Validate format
    const nameEmailRegex = /^.+?\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
    if (!nameEmailRegex.test(foundVars[varName])) {
      errors.push({
        var: varName,
        message: '❌ Invalid format: Expected "Name <email@domain.com>"',
        example: config.example,
      });
    } else {
      console.log(`✅ ${varName}: ${foundVars[varName]}`);
    }
  }
}

// Display warnings
if (warnings.length > 0) {
  console.log('\n⚠️  Optional variables not set (will use defaults):');
  for (const warning of warnings) {
    console.log(`   ${warning.var}`);
    console.log(`   Example: ${warning.example}`);
  }
}

// Display errors
if (errors.length > 0) {
  console.log('\n❌ Errors found:');
  for (const error of errors) {
    console.log(`\n   ${error.var}:`);
    console.log(`   ${error.message}`);
    console.log(`   Example: ${error.example}`);
  }
}

console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ Configuration has errors. Please fix them above.');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n✅ Required variables are set correctly!');
  console.log('⚠️  Some optional variables are missing (using defaults).');
  console.log('   This is okay, but consider setting them for better customization.');
  process.exit(0);
} else {
  console.log('\n✅ All email configuration variables are correctly set!');
  process.exit(0);
}