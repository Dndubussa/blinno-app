# Email Templates Seeding for Supabase

This directory contains SQL scripts and Node.js scripts for seeding email templates into the BLINNO platform database.

## Files

1. **[email_templates.sql](file:///g:/SAAS%20PLATFORMS/BLINNO/backend/src/db/seed/email_templates.sql)** - Original seeding script with psql meta-commands (for local PostgreSQL)
2. **[email_templates_supabase.sql](file:///g:/SAAS%20PLATFORMS/BLINNO/backend/src/db/seed/email_templates_supabase.sql)** - Supabase-compatible SQL script with placeholder content
3. **[seedEmailTemplatesSupabase.js](file:///g:/SAAS%20PLATFORMS/BLINNO/backend/src/scripts/seedEmailTemplatesSupabase.js)** - Node.js script that loads actual HTML content into Supabase

## Usage

### For Supabase Deployment

1. **Using the SQL script:**
   - Copy the contents of [email_templates_supabase.sql](file:///g:/SAAS%20PLATFORMS/BLINNO/backend/src/db/seed/email_templates_supabase.sql)
   - Paste and run in the Supabase SQL Editor
   - This creates templates with placeholder content

2. **Using the Node.js script (recommended):**
   ```bash
   cd backend
   npm run seed:email-templates-supabase
   ```
   This script loads the actual HTML template content from the files and inserts them into Supabase.

## Template Variables

Each template supports different variables that can be used in the subject and body:

### Security Templates
- `invite_user` - User invitations
- `magic_link` - Passwordless login links
- `change_email` - Email address change confirmations
- `reauthentication` - Additional security verification

### Other Template Categories
- `onboarding` - Welcome and registration emails
- `order` - Order placement confirmations
- `payment` - Payment receipt confirmations
- `subscription` - Subscription management
- `notification` - General platform notifications

## Adding New Templates

1. Create HTML template in `src/templates/emails/`
2. Add template definition to `src/scripts/seedEmailTemplatesSupabase.js`
3. Run the seeding script