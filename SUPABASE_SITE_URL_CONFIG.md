# Supabase Site URL Configuration Fix

## Problem: Email Confirmation Links Redirect to Vercel Preview URL

When users click the email confirmation link, they're being redirected to a Vercel preview deployment that shows "permission required" instead of the production site.

## Root Cause

Supabase uses its **Site URL** configuration (not the `emailRedirectTo` parameter) as the base URL for email verification links. If this is set to a Vercel preview URL, all confirmation emails will point there.

## Solution

### Step 1: Update Supabase Site URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Project Settings** → **Authentication** → **URL Configuration**
4. Set **Site URL** to: `https://www.blinno.app`
5. Add **Redirect URLs**:
   - `https://www.blinno.app/auth/callback`
   - `https://www.blinno.app/**` (wildcard for all routes)

### Step 2: Verify Environment Variables

Ensure `APP_URL` is set correctly in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `APP_URL` is set to: `https://www.blinno.app`
3. If not set, add it:
   - **Key**: `APP_URL`
   - **Value**: `https://www.blinno.app`
   - **Environment**: Production, Preview, Development (all)

### Step 3: Update Email Templates (Optional)

If you've customized email templates in Supabase:

1. Go to: **Project Settings** → **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Ensure the confirmation link uses: `{{ .ConfirmationURL }}` or `{{ .SiteURL }}/auth/callback`
4. **Do NOT** hardcode URLs in templates

## How Supabase Email Verification Works

1. **User Signs Up**: Backend calls `supabase.auth.signUp()` with `emailRedirectTo`
2. **Supabase Sends Email**: Uses **Site URL** from dashboard (not `emailRedirectTo`) as base
3. **Email Contains Link**: `{Site URL}/auth/callback?token=xxx&type=signup&hash=xxx`
4. **User Clicks Link**: Supabase verifies token and establishes session
5. **Frontend Handles**: `AuthCallback` component processes the callback and redirects

## Important Notes

- ⚠️ **Site URL overrides `emailRedirectTo`**: The `emailRedirectTo` parameter is only used if Site URL is not configured
- ⚠️ **Redirect URLs must be whitelisted**: Add all callback URLs to the Redirect URLs list
- ⚠️ **No trailing slash**: Use `https://www.blinno.app` not `https://www.blinno.app/`
- ✅ **Wildcard support**: You can use `https://www.blinno.app/**` to allow all routes

## Testing

After updating the Site URL:

1. **Sign up a new test user**
2. **Check the confirmation email** - link should point to `https://www.blinno.app/auth/callback`
3. **Click the link** - should redirect to production site, not Vercel preview
4. **Verify email** - should successfully verify and redirect to dashboard

## Current Configuration

- **Backend `emailRedirectTo`**: `${process.env.APP_URL || 'https://www.blinno.app'}/auth/callback`
- **Required Supabase Site URL**: `https://www.blinno.app`
- **Required Redirect URLs**: 
  - `https://www.blinno.app/auth/callback`
  - `https://www.blinno.app/**`

