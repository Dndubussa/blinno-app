import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing script execution...');
console.log('Current directory:', __dirname);

// Test reading a template file
try {
  const htmlPath = path.join(__dirname, '..', 'templates', 'emails', 'welcome.html');
  console.log('Looking for welcome.html at:', htmlPath);
  
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    console.log('Found welcome.html, size:', htmlContent.length, 'characters');
  } else {
    console.log('welcome.html not found');
  }
} catch (error) {
  console.error('Error reading file:', error.message);
}