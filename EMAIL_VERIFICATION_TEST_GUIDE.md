# Email Verification Test Guide

## Overview

Email verification in BLINNO is handled by **Supabase Auth** automatically. When a user signs up, Supabase sends a verification email that the user must click to verify their email address.

## How It Works

### 1. Supabase Auth Email Verification

- **Automatic**: Supabase Auth automatically sends verification emails when users sign up
- **SMTP Configuration**: Configured to use Resend SMTP (see `SUPABASE_RESEND_INTEGRATION.md`)
- **Email Template**: Uses Supabase's default templates (can be customized in Supabase dashboard)
- **Verification Link**: Contains a secure token that expires in 24 hours

### 2. Frontend Verification Flow

- **Signup**: User signs up → Supabase sends verification email → User stays on auth page
- **Verification**: User clicks link → Supabase verifies email → Frontend detects verification → User redirected to dashboard
- **Resend**: User can request a new verification email via the `EmailVerificationBanner` component

## Current Implementation

### ✅ What's Implemented

1. **Automatic Email Sending**: Supabase sends verification emails on signup
2. **Verification Status Check**: Frontend checks `email_confirmed_at` to determine verification status
3. **Auto-Redirect**: Verified users are automatically redirected to their dashboard
4. **Resend Functionality**: Users can resend verification emails via banner
5. **Verification Banner**: Shows persistent banner to unverified users
6. **Periodic Checking**: Frontend checks verification status every 30 seconds

### ⚠️ Configuration Required

1. **Supabase SMTP Settings**: Must be configured to use Resend
2. **Email Template**: `email_confirmation` template exists in database (now updated with content)

## Testing Email Verification

### Method 1: Full Signup Flow (Recommended)

1. **Sign up a new user**:
   - Go to `https://www.blinno.app/auth`
   - Fill in signup form
   - Use a real email address you can access
   - Accept Terms of Service
   - Click "Sign Up"

2. **Check for verification email**:
   - Look for email from Supabase (configured sender)
   - Subject: "Confirm your signup" (or custom subject)
   - Check spam folder if not in inbox

3. **Verify email**:
   - Click the verification link in the email
   - Should redirect to your app
   - Should automatically redirect to dashboard

4. **Verify behavior**:
   - User should be redirected to dashboard
   - Verification banner should disappear
   - User should have full access to platform

### Method 2: API Test

```bash
# 1. Register a user
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

# Response will include:
# - user object with id and email
# - token (may be null if email confirmation required)
# - session (may be null if email confirmation required)
```

### Method 3: Resend Verification Email

1. **Via UI**:
   - Log in with unverified account
   - Click "Resend Verification Email" in the banner
   - Check email for new verification link

2. **Via API** (if endpoint exists):
   ```bash
   # This would need to be implemented in backend
   # Currently handled by frontend via supabase.auth.resend()
   ```

## Verification Checklist

### Supabase Configuration

- [ ] **SMTP Settings**: Resend SMTP configured in Supabase dashboard
  - Go to: Project Settings → Authentication → SMTP Settings
  - Enable Custom SMTP
  - Host: `smtp.resend.com`
  - Port: `465` (SSL) or `587` (TLS)
  - Username: `resend`
  - Password: Your Resend API key
  - Sender: Your verified email (e.g., `noreply@blinno.app`)

- [ ] **Email Templates**: Customize Supabase email templates (optional)
  - Go to: Project Settings → Authentication → Email Templates
  - Customize confirmation email template
  - Add your branding

- [ ] **Email Confirmation**: Ensure email confirmation is enabled
  - Go to: Project Settings → Authentication → Settings
  - "Enable email confirmations" should be ON

### Frontend Verification

- [ ] **Verification Banner**: Shows for unverified users
- [ ] **Auto-Redirect**: Verified users redirected to dashboard
- [ ] **Resend Button**: Works correctly
- [ ] **Status Check**: Periodic checking works (every 30 seconds)

### Email Delivery

- [ ] **Email Received**: Verification email arrives in inbox
- [ ] **Email Content**: Contains correct verification link
- [ ] **Link Works**: Clicking link verifies email
- [ ] **Resend Works**: Resending works correctly

## Troubleshooting

### Email Not Received

1. **Check Supabase SMTP Settings**:
   - Verify Resend SMTP is configured correctly
   - Test SMTP connection in Supabase dashboard
   - Check Resend API key is correct

2. **Check Resend Dashboard**:
   - Visit https://resend.com/emails
   - Look for verification emails
   - Check delivery status

3. **Check Spam Folder**: Emails might be filtered

4. **Check Email Address**: Ensure email address is correct

### Verification Link Not Working

1. **Link Expired**: Links expire after 24 hours
   - Request a new verification email

2. **Already Verified**: Email might already be verified
   - Check user's `email_confirmed_at` in database

3. **Invalid Token**: Token might be corrupted
   - Request a new verification email

### User Not Redirected After Verification

1. **Check Frontend Logs**: Look for errors in browser console
2. **Check Verification Status**: Verify `email_confirmed_at` is set
3. **Check Hook**: Ensure `useEmailVerification` hook is working
4. **Check Redirect Logic**: Verify redirect logic in `AuthContext`

## Database Verification

Check if email is verified:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@example.com';
```

If `email_confirmed_at` is not null, email is verified.

## Code Reference

### Frontend

- **AuthContext**: `src/contexts/AuthContext.tsx`
  - Checks `email_confirmed_at` for verification status
  - Handles redirect logic

- **EmailVerificationBanner**: `src/components/EmailVerificationBanner.tsx`
  - Shows banner to unverified users
  - Provides resend functionality

- **useEmailVerification Hook**: `src/hooks/useEmailVerification.ts`
  - Periodically checks verification status
  - Listens for auth state changes

### Backend

- **Registration Route**: `backend/src/routes/auth.ts`
  - Creates user via Supabase Auth
  - Supabase automatically sends verification email

### Supabase Configuration

- **SMTP Settings**: Supabase Dashboard → Project Settings → Authentication → SMTP Settings
- **Email Templates**: Supabase Dashboard → Project Settings → Authentication → Email Templates

## Differences: Verification vs Welcome Email

| Feature | Email Verification | Welcome Email |
|---------|-------------------|---------------|
| **Sender** | Supabase Auth (via Resend SMTP) | Custom App (via Resend API) |
| **When Sent** | Automatically on signup | After registration (custom code) |
| **Purpose** | Verify email address | Welcome new user |
| **Template** | Supabase default (customizable) | Custom template in database |
| **Required** | Yes (for account activation) | No (optional) |
| **Link** | Verification link with token | Dashboard link |

## Next Steps

1. ✅ Email confirmation template updated in database
2. ⏳ Verify Supabase SMTP is configured with Resend
3. ⏳ Test full signup and verification flow
4. ⏳ Verify email received and link works
5. ⏳ Test resend functionality
6. ⏳ Verify auto-redirect after verification

---

**Status**: Ready for testing
**Last Updated**: After updating email_confirmation template

