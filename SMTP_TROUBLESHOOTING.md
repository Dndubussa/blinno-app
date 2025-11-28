# SMTP Configuration Troubleshooting Guide

## Current Issue: "535 API key not found"

This error indicates that Supabase cannot authenticate with Resend's SMTP server. This is typically caused by incorrect SMTP configuration in the Supabase Dashboard.

## Root Causes Identified

### 1. ❌ API Key Format Issue
Your Resend API key in `.env` is: `50868a26-2bee-4815-9604-05c2acd5138f`

**Problem:** Resend API keys should start with `re_` (e.g., `re_xxxxxxxxxxxxxxxxxxxxx`)

**Solution:**
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key
3. Copy the key (it starts with `re_`)
4. Update both:
   - `backend/.env` file: `RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx`
   - Supabase Dashboard SMTP Settings (see below)

### 2. ❌ SMTP Not Configured in Supabase Dashboard

The API key must be configured in **two places**:
- ✅ Backend `.env` file (for custom emails via Resend API)
- ❌ **Supabase Dashboard SMTP Settings** (for Supabase Auth emails) ← **THIS IS MISSING**

### 3. ❌ Email Template Error

There's also an email template error: `function "user_name" not defined`

## Step-by-Step Fix

### Step 1: Get Correct Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign in to your account
3. Navigate to **API Keys** section
4. Create a new API key or use existing one
5. **Verify it starts with `re_`**
6. Copy the full key

### Step 2: Configure Supabase SMTP Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Project Settings** → **Authentication** → **SMTP Settings**
4. Enable **Custom SMTP**
5. Fill in the following:

```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) or 587 (TLS)
SMTP Username: resend
SMTP Password: re_xxxxxxxxxxxxxxxxxxxxx  (Your Resend API key - MUST start with re_)
Sender Email: noreply@blinno.app  (or your verified domain email)
Sender Name: BLINNO
```

6. **Critical:** The SMTP Password field should contain your **full Resend API key** (starting with `re_`)

7. Click **Save**

### Step 3: Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Ensure your domain (`blinno.app`) is verified
3. If not verified, follow DNS verification steps
4. If domain is not verified, you can use `onboarding@resend.dev` for testing

### Step 4: Fix Email Template Error

There's an email template error: `function "user_name" not defined`

1. Go to Supabase Dashboard
2. Navigate to: **Project Settings** → **Authentication** → **Email Templates**
3. Select **Confirm signup** template
4. Check line 86 for `{{user_name}}` or similar
5. Replace with valid template variables:
   - `{{ .Email }}` - User's email
   - `{{ .Token }}` - Confirmation token
   - `{{ .TokenHash }}` - Token hash
   - `{{ .SiteURL }}` - Site URL
   - `{{ .ConfirmationURL }}` - Full confirmation URL

**Valid template variables:**
- `{{ .Email }}`
- `{{ .Token }}`
- `{{ .TokenHash }}`
- `{{ .SiteURL }}`
- `{{ .ConfirmationURL }}`
- `{{ .RedirectTo }}`

**Invalid (causes error):**
- `{{user_name}}` ❌
- `{{ .user_name }}` ❌
- `{{userName}}` ❌

### Step 5: Test Configuration

Run the diagnostic script:
```bash
npm run test:smtp
```

Or manually test:
1. Try registering a new user
2. Check Supabase Auth logs for SMTP errors
3. Check Resend dashboard for sent emails
4. Verify email is received (check spam folder)

## Verification Checklist

- [ ] Resend API key starts with `re_`
- [ ] API key is set in `backend/.env`
- [ ] API key is set in Supabase Dashboard SMTP Settings (as SMTP Password)
- [ ] SMTP Host is `smtp.resend.com`
- [ ] SMTP Port is `465` (SSL) or `587` (TLS)
- [ ] SMTP Username is `resend` (lowercase)
- [ ] Sender Email is verified in Resend
- [ ] Email template doesn't use invalid variables like `user_name`
- [ ] Custom SMTP is enabled in Supabase Dashboard

## Common Mistakes

1. **Using wrong API key format**: Resend API keys must start with `re_`
2. **Not setting SMTP Password**: The API key must be in the SMTP Password field
3. **Using unverified email**: Sender email must be verified in Resend
4. **Wrong SMTP username**: Must be exactly `resend` (lowercase)
5. **Template syntax errors**: Using invalid template variables

## Testing After Fix

1. **Test Signup:**
   ```bash
   POST /api/auth/register
   {
     "email": "test@example.com",
     "password": "Test123!@#",
     "displayName": "Test User"
   }
   ```

2. **Check Logs:**
   - Supabase Auth logs should show no "535" errors
   - Resend dashboard should show sent email

3. **Verify Email:**
   - Check inbox (and spam folder)
   - Click confirmation link
   - Verify user can log in

## Still Not Working?

1. **Check Resend API Key Status:**
   - Go to Resend Dashboard → API Keys
   - Verify key is active and not revoked

2. **Check Domain Status:**
   - Go to Resend Dashboard → Domains
   - Verify domain is verified and active

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs → Auth
   - Look for detailed error messages

4. **Test SMTP Connection:**
   - Use a tool like `telnet smtp.resend.com 465` to test connection
   - Or use an SMTP testing tool

5. **Contact Support:**
   - Resend Support: support@resend.com
   - Supabase Support: support@supabase.com

