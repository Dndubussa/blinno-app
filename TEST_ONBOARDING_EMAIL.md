# Testing Onboarding Email After Signup

## Quick Test Guide

This guide helps you verify that users receive onboarding emails after signing up.

## ✅ Prerequisites

1. **Email Template in Database**: The `welcome` email template must exist
2. **Resend API Key**: Configured in environment variables
3. **Email Address Configuration**: `RESEND_ONBOARDING_EMAIL` must be set

## 🧪 Test Methods

### Method 1: Manual Signup Test (Recommended)

1. **Go to your signup page**:
   - Navigate to `/auth` in your application
   - Or use: `https://www.blinno.app/auth`

2. **Create a new test account**:
   - Use a real email address you can access
   - Fill in all required fields
   - Accept Terms of Service
   - Click "Sign Up"

3. **Check your email**:
   - Check inbox for email from `onboarding@blinno.app` (or your configured address)
   - Subject: "Welcome to BLINNO - Discover, Create & Connect"
   - Also check spam/junk folder

4. **Verify email content**:
   - Should include user's name
   - Should include platform information
   - Should have proper formatting

### Method 2: API Test (Using curl or Postman)

```bash
curl -X POST https://www.blinno.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "displayName": "Test User",
    "role": "user",
    "firstName": "Test",
    "lastName": "User",
    "termsAccepted": true
  }'
```

Replace `test@example.com` with your actual email address.

### Method 3: Check Database Logs

After signup, check the email logs in Supabase:

```sql
SELECT 
  recipient_email,
  status,
  created_at,
  error_message
FROM email_template_logs 
WHERE template_name = 'welcome' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Verification Checklist

- [ ] Email template exists in database (`email_templates` table)
- [ ] Template has actual HTML content (not just placeholder)
- [ ] `RESEND_API_KEY` is set in environment variables
- [ ] `RESEND_ONBOARDING_EMAIL` is configured
- [ ] Domain is verified in Resend dashboard
- [ ] Email is sent (check `email_template_logs` table)
- [ ] Email is received in inbox (check spam folder too)

## 🐛 Troubleshooting

### Email Not Received

1. **Check Spam Folder**: Emails might be filtered as spam
2. **Check Resend Dashboard**: Visit https://resend.com/emails to see delivery status
3. **Check Email Logs**: Query `email_template_logs` table for errors
4. **Verify Domain**: Ensure your domain is verified in Resend
5. **Check Environment Variables**: Ensure `RESEND_API_KEY` and `RESEND_ONBOARDING_EMAIL` are set

### Template Not Found Error

If you see "Template 'welcome' not found":

1. **Seed the template**:
   ```bash
   node backend/src/scripts/seedEmailTemplatesSupabase.js
   ```

2. **Or run SQL directly in Supabase**:
   - Go to Supabase Dashboard → SQL Editor
   - Run the contents of `backend/src/db/seed/email_templates_supabase.sql`

### Email Sending Fails Silently

The signup process doesn't fail if email sending fails (by design). Check:

1. **Backend logs**: Look for "Failed to send welcome email" messages
2. **Email logs table**: Check `email_template_logs` for failed status
3. **Resend dashboard**: Check for API errors

## 📊 Expected Behavior

### Successful Signup Flow

1. User submits signup form
2. User account is created in Supabase Auth
3. Profile is created in `profiles` table
4. Welcome email is sent (non-blocking)
5. User receives email within seconds
6. Email log entry is created with status 'sent'

### Email Content

The welcome email should include:
- User's name (from `displayName`)
- Platform name: "BLINNO"
- Platform URL: "https://www.blinno.app"
- Welcome message
- Next steps or call-to-action

## 🔧 Configuration

### Environment Variables Required

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_ONBOARDING_EMAIL=BLINNO <onboarding@blinno.app>
APP_URL=https://www.blinno.app
```

### Email Template Variables

The `welcome` template uses these variables:
- `{{userName}}` - User's display name
- `{{platformName}}` - "BLINNO"
- `{{platformUrl}}` - Platform URL

## 📝 Code Reference

- **Email sending**: `backend/src/routes/auth.ts` (line 85)
- **Email service**: `backend/src/services/emailService.ts`
- **Template**: `email_templates` table, name = 'welcome'

## ✅ Test Results

After testing, document:
- [ ] Email received successfully
- [ ] Email content is correct
- [ ] Email sender is correct (`onboarding@blinno.app`)
- [ ] Email logs show 'sent' status
- [ ] No errors in backend logs

---

**Last Updated**: After implementing Terms of Service acceptance

