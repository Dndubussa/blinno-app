# Resend Email Integration Setup

This document explains how to set up and use Resend for email functionality in the BLINNO platform.

> **Note:** If you've integrated Resend with Supabase (configured Resend as Supabase's SMTP provider), see [SUPABASE_RESEND_INTEGRATION.md](./SUPABASE_RESEND_INTEGRATION.md) for details on the dual integration.

## Overview

Resend has been integrated into the BLINNO backend to handle all email communications, including:
- Welcome emails for new users
- Password reset emails (via Supabase Auth if integrated)
- Order confirmations
- Notification emails
- Custom templated emails

## Setup Instructions

### 1. Get Resend API Key

1. Sign up for a Resend account at [https://resend.com](https://resend.com)
2. Navigate to your dashboard
3. Go to **API Keys** section
4. Create a new API key
5. Copy the API key (you'll only see it once!)

### 2. Verify Your Domain (Optional but Recommended)

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `blinno.app`)
3. Follow the DNS verification steps
4. Once verified, you can send emails from `noreply@blinno.app` or any address on your domain

### 3. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.app>
```

**Note:** If you haven't verified a domain, you can use Resend's test domain:
```env
RESEND_FROM_EMAIL=BLINNO <onboarding@resend.dev>
```

### 4. Restart Your Backend Server

After adding the environment variables, restart your backend server:

```bash
cd backend
npm run dev
```

## Email Service Features

### Available Functions

The email service (`backend/src/services/emailService.ts`) provides:

1. **`sendEmail(options)`** - Send a plain email
2. **`sendTemplatedEmail(templateName, to, variables)`** - Send email using a database template
3. **`sendWelcomeEmail(userEmail, userName)`** - Send welcome email to new users
4. **`sendOrderConfirmationEmail(...)`** - Send order confirmation
5. **`sendPasswordResetEmail(userEmail, resetToken)`** - Send password reset email
6. **`sendNotificationEmail(...)`** - Send notification email

### Using Email Templates

Email templates are stored in the `email_templates` table in your Supabase database. To use a template:

1. Create a template in the database (via admin panel or API)
2. Use variables in your template with `{{variableName}}` syntax
3. Call `sendTemplatedEmail()` with the template name and variables

Example template:
```html
<h1>Welcome {{userName}}!</h1>
<p>Thank you for joining {{platformName}}.</p>
```

Usage:
```typescript
await sendTemplatedEmail('welcome', userEmail, {
  userName: 'John Doe',
  platformName: 'BLINNO',
});
```

## Integration Points

### 1. User Registration

Welcome emails are automatically sent when users register via `/api/auth/register`.

### 2. Password Reset

Password reset emails are sent via `/api/auth/forgot-password`.

### 3. Notifications

Notification emails are sent through the `NotificationService` when:
- Users have email notifications enabled
- A notification is created
- The notification type is enabled in user preferences

### 4. Order Confirmations

Order confirmation emails can be sent when orders are placed (to be implemented in order routes).

## Email Templates in Database

The system uses the `email_templates` table to store reusable email templates. Default templates include:

- `welcome` - Welcome email for new users
- `password_reset` - Password reset email
- `order_placed` - Order confirmation
- `notification` - General notification email

You can create, update, and manage templates via:
- Admin API: `/api/email-templates`
- Direct database access
- Supabase dashboard

## Testing

### Test Email Sending

You can test email functionality by:

1. **Register a new user** - Should receive welcome email
2. **Request password reset** - Should receive reset email
3. **Create a notification** - Should receive notification email (if enabled)

### Check Email Logs

Email sends are logged in:
- `email_notifications` table - For notification emails
- `email_template_logs` table - For templated emails

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check From Email**: Ensure `RESEND_FROM_EMAIL` is verified in Resend
3. **Check Logs**: Look for errors in backend console
4. **Check Resend Dashboard**: View email logs in Resend dashboard

### Common Issues

- **"Email service not configured"**: `RESEND_API_KEY` is missing
- **"Invalid from address"**: Domain not verified in Resend
- **"Template not found"**: Email template doesn't exist in database

## Production Considerations

1. **Domain Verification**: Verify your domain in Resend for production
2. **Rate Limits**: Be aware of Resend rate limits (check your plan)
3. **Monitoring**: Set up monitoring for failed email sends
4. **Bounce Handling**: Configure bounce handling in Resend
5. **Unsubscribe**: Implement unsubscribe functionality for marketing emails

## Next Steps

1. ✅ Resend package installed
2. ✅ Email service created
3. ✅ Notification service integrated
4. ✅ Welcome emails on registration
5. ✅ Password reset emails
6. ⏳ Create default email templates in database
7. ⏳ Set up email monitoring and alerts
8. ⏳ Configure bounce handling

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/send-with-nodejs)

