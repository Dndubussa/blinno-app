# Marketing Emails Guide

This guide explains how to send marketing emails to registered users on the BLINNO platform.

## Overview

The platform uses **Resend** for sending marketing emails. The marketing email system supports:
- ✅ Sending to all users or filtered segments
- ✅ Using email templates or custom HTML
- ✅ Batch sending with rate limiting
- ✅ Test mode for safe testing
- ✅ User statistics for campaign planning

## Prerequisites

1. **Resend API Key**: Ensure `RESEND_API_KEY` is set in your environment variables
2. **Marketing Email Address**: Configure `RESEND_MARKETING_EMAIL` (defaults to `marketing@blinno.com`)
3. **Admin Access**: Only admins can send marketing emails

## API Endpoints

### 1. Send Marketing Email

**Endpoint:** `POST /api/marketing/send`  
**Auth:** Admin only

#### Using Custom HTML

```json
{
  "subject": "New Features Available!",
  "html": "<h1>Hello {{userName}}!</h1><p>We have exciting news...</p>",
  "text": "Hello {{userName}}! We have exciting news...",
  "filters": {
    "role": "creator",
    "isCreator": true,
    "emailVerified": true,
    "country": "Tanzania"
  },
  "batchSize": 50,
  "testMode": false
}
```

#### Using Email Template

```json
{
  "templateName": "newsletter",
  "templateVariables": {
    "featureName": "New Dashboard",
    "promoCode": "SAVE20"
  },
  "filters": {
    "role": "creator"
  },
  "testMode": true
}
```

#### Available Filters

- `role`: Filter by user role (e.g., "creator", "freelancer", "seller")
- `isCreator`: Boolean - filter by creator status
- `emailVerified`: Boolean - filter by email verification status
- `country`: String - filter by country/location

#### Parameters

- `subject`: Email subject (required if not using template)
- `html`: HTML email content (required if not using template)
- `text`: Plain text version (optional)
- `templateName`: Name of email template from database (alternative to custom HTML)
- `templateVariables`: Variables to replace in template (e.g., `{{userName}}`, `{{userEmail}}`)
- `filters`: Object with filter criteria
- `batchSize`: Number of emails to send per batch (default: 50)
- `testMode`: If true, only sends to first user (default: false)

#### Response

```json
{
  "success": true,
  "sent": 150,
  "failed": 2,
  "total": 152,
  "testMode": false,
  "errors": [
    {
      "email": "invalid@example.com",
      "error": "Invalid email address"
    }
  ]
}
```

### 2. Get Marketing Statistics

**Endpoint:** `GET /api/marketing/stats`  
**Auth:** Admin only

Returns user statistics for campaign planning:

```json
{
  "totalUsers": 1250,
  "creators": 450,
  "regularUsers": 800,
  "byRole": {
    "creator": 200,
    "freelancer": 150,
    "seller": 100,
    "user": 800
  },
  "byCountry": {
    "Tanzania": 600,
    "Kenya": 300,
    "Uganda": 200,
    "Other": 150
  }
}
```

## Usage Examples

### Example 1: Send Newsletter to All Users

```bash
curl -X POST https://www.blinno.app/api/marketing/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Monthly Newsletter - January 2025",
    "html": "<h1>Hello {{userName}}!</h1><p>Check out our latest updates...</p>",
    "text": "Hello {{userName}}! Check out our latest updates...",
    "batchSize": 50
  }'
```

### Example 2: Send to Creators Only (Test Mode)

```bash
curl -X POST https://www.blinno.app/api/marketing/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "New Creator Features",
    "html": "<h1>Hi {{userName}}!</h1><p>As a creator, you'll love these new features...</p>",
    "filters": {
      "role": "creator",
      "emailVerified": true
    },
    "testMode": true
  }'
```

### Example 3: Using Email Template

First, create a template in the database:

```sql
INSERT INTO email_templates (name, subject, body_html, is_active)
VALUES (
  'newsletter',
  'BLINNO Newsletter - {{month}}',
  '<h1>Hello {{userName}}!</h1><p>Welcome to our {{month}} newsletter...</p>',
  true
);
```

Then send:

```bash
curl -X POST https://www.blinno.app/api/marketing/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "newsletter",
    "templateVariables": {
      "month": "January 2025"
    },
    "filters": {
      "emailVerified": true
    }
  }'
```

## Email Templates

### Available Variables

When using templates or custom HTML, you can use these variables:

- `{{userName}}` - User's display name
- `{{userEmail}}` - User's email address
- Any custom variables you pass in `templateVariables`

### Creating Templates

Templates are stored in the `email_templates` table:

```sql
INSERT INTO email_templates (
  name,
  subject,
  body_html,
  body_text,
  is_active
) VALUES (
  'newsletter',
  'BLINNO Newsletter - {{month}}',
  '<html>...your HTML...</html>',
  'Plain text version...',
  true
);
```

## Best Practices

1. **Always Test First**: Use `testMode: true` to send to yourself first
2. **Start Small**: Test with small batches before sending to all users
3. **Respect Rate Limits**: Use `batchSize` to control sending speed
4. **Filter Appropriately**: Use filters to target relevant users
5. **Include Unsubscribe**: Always include unsubscribe links in marketing emails
6. **Monitor Results**: Check the `errors` array in the response

## Rate Limiting

- Resend has rate limits based on your plan
- The system sends emails in batches with 1-second delays between batches
- Default batch size is 50 emails
- Adjust `batchSize` based on your Resend plan limits

## Unsubscribe Management

**Important**: You should implement unsubscribe functionality:

1. Add an `unsubscribed_users` table or field in `profiles`
2. Check unsubscribe status before sending
3. Include unsubscribe links in emails
4. Handle unsubscribe requests

Example unsubscribe check:

```typescript
// In marketing.ts, before sending:
const { data: unsubscribed } = await supabase
  .from('unsubscribed_users')
  .select('user_id')
  .in('user_id', userIds);

const unsubscribedIds = new Set(unsubscribed?.map(u => u.user_id) || []);
const recipients = userEmails.filter(u => !unsubscribedIds.has(u.userId));
```

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify marketing email address is configured
3. Check Resend dashboard for errors
4. Review response `errors` array

### Rate Limit Errors

- Reduce `batchSize`
- Increase delay between batches
- Upgrade Resend plan if needed

### Template Not Found

- Verify template exists in `email_templates` table
- Check `is_active` is `true`
- Ensure template name matches exactly

## Security Notes

- Only admins can send marketing emails
- Always validate email content
- Never expose user emails in responses
- Log all marketing email sends for audit

## Unsubscribe Functionality

The platform now includes full unsubscribe functionality:

### Unsubscribe Endpoint

**Endpoint:** `POST /api/unsubscribe`  
**Auth:** Optional (works with or without authentication)

```json
{
  "email": "user@example.com",
  "reason": "Too many emails" // Optional
}
```

### Unsubscribe Page

Users can unsubscribe via the frontend at `/unsubscribe?email=user@example.com`

### Resubscribe

**Endpoint:** `POST /api/unsubscribe/resubscribe`  
**Auth:** Required

Allows users to resubscribe to marketing emails.

### Check Status

**Endpoint:** `GET /api/unsubscribe/status`  
**Auth:** Required

Returns the user's current unsubscribe status.

### Automatic Filtering

The marketing email system automatically:
- ✅ Skips unsubscribed users
- ✅ Respects `marketing_emails_enabled` profile preference
- ✅ Logs unsubscribe actions

## Email Templates

Pre-configured templates are available:

1. **newsletter** - Monthly newsletter template
2. **feature_announcement** - New feature announcements
3. **promotional** - Promotional offers and discounts

To use templates, run the migration:
```bash
npm run supabase:migrate
```

Or apply manually:
```sql
-- Run backend/migrations/add_marketing_email_templates.sql
```

## Testing

### Test Marketing System

```bash
npm run marketing:test
```

This will:
- Get user statistics
- Send a test email (test mode)
- Verify the system is working

### Test Unsubscribe

1. Visit `/unsubscribe?email=your@email.com`
2. Or use the API:
```bash
curl -X POST https://www.blinno.app/api/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## Next Steps

1. ✅ Set up email templates in the database (migration created)
2. ✅ Test with `testMode: true` (script available)
3. ✅ Implement unsubscribe functionality (completed)
4. Create marketing campaigns
5. Monitor delivery rates
6. Add unsubscribe links to all marketing emails

