/**
 * Email Configuration Validator
 * Validates that all email environment variables are correctly set
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

interface EmailConfig {
  name: string;
  envVar: string;
  value: string | undefined;
  required: boolean;
  format: 'email' | 'name-email';
  example: string;
}

const emailConfigs: EmailConfig[] = [
  {
    name: 'Default/NoReply',
    envVar: 'RESEND_FROM_EMAIL',
    value: process.env.RESEND_FROM_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO <noreply@blinno.com>',
  },
  {
    name: 'Onboarding',
    envVar: 'RESEND_ONBOARDING_EMAIL',
    value: process.env.RESEND_ONBOARDING_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO <onboarding@blinno.com>',
  },
  {
    name: 'Support',
    envVar: 'RESEND_SUPPORT_EMAIL',
    value: process.env.RESEND_SUPPORT_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO Support <support@blinno.com>',
  },
  {
    name: 'Finance',
    envVar: 'RESEND_FINANCE_EMAIL',
    value: process.env.RESEND_FINANCE_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO Finance <finance@blinno.com>',
  },
  {
    name: 'Orders',
    envVar: 'RESEND_ORDERS_EMAIL',
    value: process.env.RESEND_ORDERS_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO Orders <orders@blinno.com>',
  },
  {
    name: 'Security',
    envVar: 'RESEND_SECURITY_EMAIL',
    value: process.env.RESEND_SECURITY_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO Security <security@blinno.com>',
  },
  {
    name: 'Marketing',
    envVar: 'RESEND_MARKETING_EMAIL',
    value: process.env.RESEND_MARKETING_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO <marketing@blinno.com>',
  },
  {
    name: 'System',
    envVar: 'RESEND_SYSTEM_EMAIL',
    value: process.env.RESEND_SYSTEM_EMAIL,
    required: false,
    format: 'name-email',
    example: 'BLINNO <system@blinno.com>',
  },
  {
    name: 'Resend API Key',
    envVar: 'RESEND_API_KEY',
    value: process.env.RESEND_API_KEY,
    required: true,
    format: 'email',
    example: 're_xxxxxxxxxxxxxxxxxxxxx',
  },
];

function validateEmailFormat(value: string, format: 'email' | 'name-email'): { valid: boolean; error?: string } {
  if (format === 'email') {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
  } else {
    // Name-email format: "Name <email@domain.com>"
    const nameEmailRegex = /^.+?\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
    if (!nameEmailRegex.test(value)) {
      return { valid: false, error: 'Invalid format. Expected: "Name <email@domain.com>"' };
    }
    
    // Extract email and validate
    const emailMatch = value.match(/<([^\s@]+@[^\s@]+\.[^\s@]+)>/);
    if (!emailMatch) {
      return { valid: false, error: 'Could not extract email address' };
    }
    
    return { valid: true };
  }
}

function validateApiKey(value: string): { valid: boolean; error?: string } {
  if (!value.startsWith('re_')) {
    return { valid: false, error: 'Resend API key should start with "re_"' };
  }
  if (value.length < 20) {
    return { valid: false, error: 'Resend API key seems too short' };
  }
  return { valid: true };
}

function main() {
  console.log('🔍 Validating Email Configuration...\n');
  console.log('=' .repeat(60));
  
  let hasErrors = false;
  let hasWarnings = false;
  const results: Array<{ config: EmailConfig; status: 'ok' | 'warning' | 'error'; message: string }> = [];

  for (const config of emailConfigs) {
    if (!config.value) {
      if (config.required) {
        results.push({
          config,
          status: 'error',
          message: `❌ REQUIRED but not set`,
        });
        hasErrors = true;
      } else {
        results.push({
          config,
          status: 'warning',
          message: `⚠️  Not set (will use default: ${config.example})`,
        });
        hasWarnings = true;
      }
      continue;
    }

    // Validate format
    if (config.envVar === 'RESEND_API_KEY') {
      const validation = validateApiKey(config.value);
      if (!validation.valid) {
        results.push({
          config,
          status: 'error',
          message: `❌ ${validation.error}`,
        });
        hasErrors = true;
        continue;
      }
    } else {
      const validation = validateEmailFormat(config.value, config.format);
      if (!validation.valid) {
        results.push({
          config,
          status: 'error',
          message: `❌ ${validation.error}`,
        });
        hasErrors = true;
        continue;
      }
    }

    // Check if value is masked (for API key)
    const displayValue = config.envVar === 'RESEND_API_KEY' 
      ? `${config.value.substring(0, 7)}...${config.value.substring(config.value.length - 4)}`
      : config.value;

    results.push({
      config,
      status: 'ok',
      message: `✅ Set correctly: ${displayValue}`,
    });
  }

  // Display results
  for (const result of results) {
    console.log(`\n${result.config.name} (${result.config.envVar}):`);
    console.log(`  ${result.message}`);
    if (result.status === 'ok' && result.config.envVar !== 'RESEND_API_KEY') {
      console.log(`  Example format: ${result.config.example}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  
  // Summary
  if (hasErrors) {
    console.log('\n❌ Validation FAILED - Please fix the errors above');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  Validation passed with warnings - Some variables use defaults');
    console.log('   This is okay, but consider setting them for better customization');
    process.exit(0);
  } else {
    console.log('\n✅ All email configuration variables are correctly set!');
    process.exit(0);
  }
}

main();

