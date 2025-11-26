# Email Service Testing Guide

This guide explains how to test the email service to confirm that all email addresses are properly configured and working.

## Prerequisites

1. **Environment Variables**: Ensure all Resend environment variables are set in `backend/.env`
2. **Resend API Key**: A valid Resend API key with sending permissions
3. **Verified Domain**: Your domain should be verified in Resend
4. **Test Email Address**: An email address to receive test messages

## Test Script

A test script has been created at `backend/scripts/test-email-service.js` that tests all email functionality.

## Running the Tests

### 1. Set Test Email Address

Add your test email address to the backend `.env` file:
```env
TEST_EMAIL=your-test-email@example.com
```

### 2. Run the Test Script

From the backend directory, run:
```bash
npm run test:email
```

### 3. Alternative Method

You can also run the script directly:
```bash
cd backend
node scripts/test-email-service.js
```

## What the Tests Cover

The test script sends emails using all configured email addresses:

1. **Default Sender** - Uses `noreply@blinno.app`
2. **Onboarding Email** - Uses `onboarding@blinno.app`
3. **Security Email** - Uses `security@blinno.app`
4. **Support Email** - Uses `support@blinno.app`
5. **Finance Email** - Uses `finance@blinno.app`

## Expected Results

Each test should show:
- ✅ Success message for successful email sends
- Message ID for tracking in Resend dashboard

## Verification Steps

### 1. Check Email Inbox
- Look for 5 test emails in your test email inbox
- Verify sender addresses match expected values:
  - `BLINNO <noreply@blinno.app>`
  - `BLINNO <onboarding@blinno.app>`
  - `BLINNO Security <security@blinno.app>`
  - `BLINNO Support <support@blinno.app>`
  - `BLINNO Finance <finance@blinno.app>`

### 2. Check Resend Dashboard
- Visit [Resend Dashboard](https://resend.com/emails)
- Verify all 5 emails appear in the email list
- Check delivery status for each email

### 3. Check Email Logs
- Supabase database tables:
  - `email_template_logs` - For templated emails
  - `notifications` - For notification emails (if notification service is enabled)

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY not set"**
   - Ensure `RESEND_API_KEY` is in your `backend/.env` file
   - Restart the backend server after adding the key

2. **"Invalid from address"**
   - Verify your domain is verified in Resend
   - Check that all email addresses in `.env` match your verified domain

3. **"Template not found"**
   - Some tests use email templates that must exist in the database
   - Default templates include: `welcome`, `password_reset`, `notification`

4. **Emails not received**
   - Check spam/junk folders
   - Verify the test email address is correct
   - Check Resend dashboard for delivery errors

### Debugging

To see more detailed output, you can run the test with debug logging:
```bash
DEBUG=email-service npm run test:email
```

## Manual Testing

You can also manually test email functionality through the API:

1. **User Registration**
   ```bash
   POST /api/auth/register
   {
     "email": "test@example.com",
     "password": "securepassword",
     "displayName": "Test User"
   }
   ```
   Should receive welcome email from `onboarding@blinno.app`

2. **Password Reset**
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "test@example.com"
   }
   ```
   Should receive password reset email from `security@blinno.app`

3. **Create Notification**
   If you have admin access, create a notification for the test user through the notifications API.

## Production Considerations

1. **Rate Limits**: Be aware of Resend's rate limits during testing
2. **Costs**: Each email sent counts toward your Resend plan limits
3. **Monitoring**: Set up monitoring for failed email sends in production
4. **Bounce Handling**: Configure bounce handling in Resend for production use

## Next Steps

Once testing is complete:
1. Remove the test email address from your `.env` file (if it was temporary)
2. Document any issues found and resolve them
3. Proceed with confidence that your email system is properly configured