# Supabase + Resend Email Integration

This document explains how Resend is integrated with Supabase for email functionality in the BLINNO platform.

## Overview

Resend has been integrated with Supabase in two ways:

1. **Supabase Auth Emails** - Configured in Supabase dashboard to use Resend SMTP
2. **Custom Application Emails** - Direct Resend API calls from the backend

## Supabase Auth Email Configuration

### Setup in Supabase Dashboard

1. **Navigate to Project Settings:**
   - Go to your Supabase project dashboard
   - Click **Project Settings** → **Authentication** → **SMTP Settings**

2. **Configure Resend SMTP:**
   - Enable **Custom SMTP**
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `465` (SSL) or `587` (TLS)
   - **SMTP Username:** `resend`
   - **SMTP Password:** Your Resend API key (starts with `re_`)
   - **Sender Email:** Your verified Resend email (e.g., `noreply@blinno.app`)
   - **Sender Name:** `BLINNO`

3. **Save Settings**

### What This Enables

With Resend configured as Supabase's SMTP provider, the following Supabase Auth emails will be sent through Resend:

- ✅ Email confirmation emails
- ✅ Password reset emails
- ✅ Magic link emails
- ✅ Email change confirmation
- ✅ Other Supabase Auth transactional emails

**Note:** These emails use Supabase's default templates, but they're sent through your Resend account.

## Custom Application Emails

The backend also uses Resend directly for custom application emails:

- ✅ Welcome emails (on registration)
- ✅ Order confirmations
- ✅ Notification emails
- ✅ Custom templated emails

These are sent using the Resend API directly from `backend/src/services/emailService.ts`.

## Configuration

### Environment Variables

Add to `backend/.env`:

```env
# Resend API Key (for custom emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# From email for custom emails
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.app>

# App URL (for email links)
APP_URL=https://www.blinno.app
```

### Supabase Configuration

The Resend API key is also configured in Supabase dashboard:
- **Project Settings** → **Authentication** → **SMTP Settings**
- Use the same API key as `RESEND_API_KEY`

## Email Flow

### 1. Supabase Auth Emails (via SMTP)

```
User Action → Supabase Auth → Resend SMTP → Email Sent
```

Examples:
- User requests password reset → Supabase sends email via Resend SMTP
- User signs up → Supabase sends confirmation email via Resend SMTP

### 2. Custom Application Emails (via API)

```
Application Code → Resend API → Email Sent
```

Examples:
- User registers → Backend sends welcome email via Resend API
- Order placed → Backend sends confirmation via Resend API
- Notification created → Backend sends notification email via Resend API

## Benefits of This Integration

1. **Unified Email Provider:** All emails go through Resend
2. **Better Deliverability:** Resend handles email authentication and reputation
3. **Consistent Branding:** All emails can use your verified domain
4. **Analytics:** Track all emails in Resend dashboard
5. **Reliability:** Resend's infrastructure ensures high deliverability

## Email Templates

### Supabase Auth Templates

Supabase Auth emails use Supabase's built-in templates. You can customize them in:
- **Project Settings** → **Authentication** → **Email Templates**

### Custom Application Templates

Custom emails use templates stored in the `email_templates` database table:
- Managed via `/api/email-templates` API
- Support variable substitution (e.g., `{{userName}}`)
- Stored in Supabase database

## Testing

### Test Supabase Auth Emails

1. **Password Reset:**
   ```bash
   POST /api/auth/forgot-password
   { "email": "user@example.com" }
   ```
   - Check Resend dashboard for sent email
   - Email sent via Supabase → Resend SMTP

2. **Email Confirmation:**
   - Register a new user
   - Check Resend dashboard for confirmation email

### Test Custom Application Emails

1. **Welcome Email:**
   ```bash
   POST /api/auth/register
   { "email": "user@example.com", "password": "...", "displayName": "John" }
   ```
   - Check Resend dashboard for welcome email
   - Email sent via Resend API

2. **Notification Email:**
   - Create a notification for a user with email notifications enabled
   - Check Resend dashboard for notification email

## Monitoring

### Resend Dashboard

Monitor all emails (both Supabase Auth and custom) in Resend dashboard:
- **Emails** tab - View all sent emails
- **Analytics** - Track opens, clicks, bounces
- **Logs** - Debug email issues

### Database Logs

Custom emails are also logged in Supabase:
- `email_notifications` table - Notification emails
- `email_template_logs` table - Templated emails

## Troubleshooting

### Emails Not Sending

1. **Check Supabase SMTP Settings:**
   - Verify Resend SMTP is configured correctly
   - Test SMTP connection in Supabase dashboard

2. **Check Resend API Key:**
   - Verify `RESEND_API_KEY` is set in backend `.env`
   - Verify same key is used in Supabase SMTP settings

3. **Check Domain Verification:**
   - Ensure your domain is verified in Resend
   - Check DNS records are correct

4. **Check Email Logs:**
   - Resend dashboard → Emails tab
   - Supabase database → `email_notifications` and `email_template_logs` tables

### Supabase Auth Emails Not Using Resend

If Supabase Auth emails are still using default Supabase emails:

1. Verify SMTP settings are saved in Supabase dashboard
2. Check that "Enable Custom SMTP" is toggled ON
3. Test SMTP connection in Supabase dashboard
4. Verify Resend API key is correct

### Custom Emails Not Sending

If custom application emails aren't sending:

1. Check `RESEND_API_KEY` in backend `.env`
2. Check backend logs for errors
3. Verify Resend API key is valid
4. Check Resend dashboard for API errors

## Best Practices

1. **Use Verified Domain:** Always use a verified domain for `FROM_EMAIL`
2. **Monitor Deliverability:** Check Resend dashboard regularly
3. **Handle Bounces:** Set up bounce handling in Resend
4. **Rate Limits:** Be aware of Resend rate limits
5. **Template Management:** Keep email templates in database for easy updates
6. **Error Handling:** Always handle email send failures gracefully

## Next Steps

1. ✅ Resend configured in Supabase SMTP settings
2. ✅ Resend API integrated in backend
3. ✅ Welcome emails on registration
4. ✅ Password reset emails via Supabase Auth
5. ✅ Notification emails
6. ⏳ Set up email monitoring and alerts
7. ⏳ Configure bounce handling
8. ⏳ Create default email templates
9. ⏳ Set up email analytics dashboard

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend + Supabase Guide](https://resend.com/docs/send-with-supabase-smtp)

