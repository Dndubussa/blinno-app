# SMTP Configuration Verification Checklist

## ✅ To Verify SMTP is Working:

### 1. Check Recent Signup Attempts
The most recent errors in logs show "535 API key not found" from earlier attempts. To confirm SMTP is now working:

1. **Try a new signup** with a test email
2. **Check Supabase Auth logs** - should show no "535" errors
3. **Check Resend dashboard** - should show sent email
4. **Check email inbox** - should receive confirmation email

### 2. Verify Configuration in Supabase Dashboard

Go to: **Project Settings** → **Authentication** → **SMTP Settings**

Confirm these settings:
- ✅ **Custom SMTP** is **Enabled**
- ✅ **SMTP Host:** `smtp.resend.com`
- ✅ **SMTP Port:** `465` (SSL) or `587` (TLS)
- ✅ **SMTP Username:** `resend` (lowercase)
- ✅ **SMTP Password:** Your Resend API key (must start with `re_`)
- ✅ **Sender Email:** Your verified Resend email address
- ✅ **Sender Name:** `BLINNO`

### 3. Fix Email Template Error

There's still an email template error that needs to be fixed:

**Error:** `function "user_name" not defined` at line 86 of confirmation template

**Fix:**
1. Go to: **Project Settings** → **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Find line 86 (or search for `user_name`)
4. Replace `{{user_name}}` or `{{ .user_name }}` with:
   - `{{ .Email }}` - User's email address
   - Or remove it if not needed

**Valid template variables:**
- `{{ .Email }}`
- `{{ .Token }}`
- `{{ .TokenHash }}`
- `{{ .SiteURL }}`
- `{{ .ConfirmationURL }}`
- `{{ .RedirectTo }}`

### 4. Test SMTP Configuration

Run the diagnostic script:
```bash
npm run test:smtp
```

This will:
- ✅ Check API key format
- ✅ Test Resend API connection
- ✅ Verify domain status
- ✅ Send a test email

### 5. Test Signup Flow

1. Register a new test user
2. Check for errors in browser console
3. Check Supabase Auth logs (should show no "535" errors)
4. Check Resend dashboard for sent email
5. Check email inbox (and spam folder)

## Expected Behavior After Fix

✅ **No "535 API key not found" errors** in Supabase logs
✅ **No template errors** in Supabase logs  
✅ **Emails appear in Resend dashboard**
✅ **Users receive confirmation emails**
✅ **Registration completes successfully**

## If Still Not Working

1. **Double-check API key format** - Must start with `re_`
2. **Verify API key is in SMTP Password field** (not just .env)
3. **Check Resend dashboard** - Ensure API key is active
4. **Check domain verification** - Sender email must be verified
5. **Review Supabase logs** - Look for specific error messages
6. **Test with diagnostic script** - `npm run test:smtp`

