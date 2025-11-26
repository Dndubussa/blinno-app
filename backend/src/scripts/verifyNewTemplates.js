import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New template names to verify
const newTemplates = [
  'invite_user',
  'magic_link',
  'change_email',
  'reauthentication'
];

console.log('Verifying new email templates...\n');

let successCount = 0;
let errorCount = 0;

for (const templateName of newTemplates) {
  try {
    console.log(`Checking ${templateName} template...`);
    
    // Check if HTML template exists
    const htmlPath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      console.log(`  ✓ HTML template found (${htmlContent.length} characters)`);
    } else {
      throw new Error(`HTML template not found at ${htmlPath}`);
    }
    
    // Check if text template exists (optional)
    const textPath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.txt`);
    if (fs.existsSync(textPath)) {
      const textContent = fs.readFileSync(textPath, 'utf8');
      console.log(`  ✓ Text template found (${textContent.length} characters)`);
    } else {
      console.log(`  - No text template found (optional)`);
    }
    
    successCount++;
    console.log('');
  } catch (error) {
    console.error(`  ✗ Error checking ${templateName}: ${error.message}\n`);
    errorCount++;
  }
}

console.log(`Verification Results:`);
console.log(`  Successful: ${successCount}`);
console.log(`  Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log(`\n✓ All new email templates verified successfully!`);
} else {
  console.log(`\n✗ ${errorCount} template(s) failed verification.`);
  process.exit(1);
}