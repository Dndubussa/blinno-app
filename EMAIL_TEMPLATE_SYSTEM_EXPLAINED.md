# Email Template System Explained

## Overview

The BLINNO platform uses **two separate email template systems**:

1. **Supabase Auth Templates** - For authentication emails (verification, password reset, etc.)
2. **Custom Application Templates** - For business emails (welcome, orders, notifications, etc.)

## 1. Supabase Auth Email Templates

### What They're Used For

- ✅ Email verification (confirm signup)
- ✅ Password reset
- ✅ Magic link login
- ✅ Email change confirmation
- ✅ Re-authentication requests

### Where They're Configured

**Supabase Dashboard** → **Project Settings** → **Authentication** → **Email Templates**

### How They Work

1. User signs up → Backend calls `supabase.auth.signUp()`
2. Supabase Auth automatically sends verification email
3. Uses template from Supabase Dashboard (not database)
4. Email sent via Resend SMTP (configured in Supabase SMTP Settings)

### Customization

You can customize these templates in the Supabase Dashboard:
- Edit HTML content
- Use Supabase template variables:
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Verification token
  - `{{ .ConfirmationURL }}` - Full confirmation URL
  - `{{ .SiteURL }}` - Base site URL
  - `{{ .RedirectTo }}` - Redirect URL after verification

### Important Notes

- ⚠️ **These templates are NOT in your database** - They're managed in Supabase Dashboard
- ⚠️ **Site URL from dashboard** is used as base URL (not `emailRedirectTo` parameter)
- ✅ **Customizable** - You can fully customize the HTML and styling
- ✅ **Variables** - Use Supabase's template variable syntax

## 2. Custom Application Email Templates

### What They're Used For

- ✅ Welcome/onboarding emails
- ✅ Order confirmations
- ✅ Payment receipts
- ✅ Subscription notifications
- ✅ Marketing emails
- ✅ General notifications

### Where They're Stored

**Database Table**: `email_templates`

### How They Work

1. Backend code calls `sendTemplatedEmail()` function
2. Function fetches template from `email_templates` table
3. Replaces variables in template (e.g., `{{user_name}}`)
4. Sends email via Resend API

### Example Usage

```typescript
import { sendTemplatedEmail } from './services/emailService';

await sendTemplatedEmail(
  'welcome',
  user.email,
  {
    user_name: user.displayName,
    dashboard_url: 'https://www.blinno.app/dashboard',
  }
);
```

### Template Variables

Each template defines its variables in the `variables` JSONB column:
- `welcome`: `user_name`, `dashboard_url`, `unsubscribe_url`
- `order_placed`: `customer_name`, `order_id`, `order_total`
- `payment_received`: `customer_name`, `amount`, `transaction_id`

## Key Differences

| Feature | Supabase Auth Templates | Custom App Templates |
|---------|------------------------|---------------------|
| **Location** | Supabase Dashboard | Database (`email_templates` table) |
| **Used For** | Auth emails (verification, password reset) | Business emails (welcome, orders) |
| **Sending Method** | Supabase Auth → Resend SMTP | Backend Code → Resend API |
| **Variables** | Supabase syntax: `{{ .Email }}` | Custom syntax: `{{user_name}}` |
| **Customization** | Supabase Dashboard | Database or API |
| **Automatic** | Yes (on signup, password reset, etc.) | No (must call from code) |

## Email Verification Flow

### Step-by-Step

1. **User Signs Up**:
   ```
   User → Frontend → Backend API → supabase.auth.signUp()
   ```

2. **Supabase Sends Email**:
   ```
   Supabase Auth → Resend SMTP → User's Email
   ```
   - Uses **Supabase Dashboard template** (not database)
   - Link format: `{Site URL}/auth/callback?token=xxx&type=signup&hash=xxx`

3. **User Clicks Link**:
   ```
   User clicks link → Supabase verifies token → Session established
   ```

4. **Frontend Handles**:
   ```
   AuthCallback component → Extracts token → Refreshes session → Redirects to dashboard
   ```

## Which Template is Used for Email Verification?

**Answer: Supabase Dashboard Template (NOT database template)**

- The `email_confirmation` template in your database is **NOT used** for Supabase Auth emails
- Supabase uses its own "Confirm signup" template from the dashboard
- To customize the verification email, edit it in:
  - **Supabase Dashboard** → **Project Settings** → **Authentication** → **Email Templates** → **Confirm signup**

## Customization Guide

### To Customize Email Verification Email

1. Go to Supabase Dashboard
2. Navigate to: **Project Settings** → **Authentication** → **Email Templates**
3. Select **Confirm signup** template
4. Edit the HTML content
5. Use Supabase variables:
   - `{{ .Email }}` - User's email
   - `{{ .ConfirmationURL }}` - Full confirmation link
   - `{{ .SiteURL }}` - Base URL (from Site URL setting)
6. Save changes

### To Customize Welcome Email

1. Update template in database:
   ```sql
   UPDATE email_templates 
   SET body_html = '<your HTML>'
   WHERE name = 'welcome';
   ```
2. Or use the API:
   ```bash
   PUT /api/email-templates/welcome
   ```

## Summary

- ✅ **Supabase email templates ARE used** for authentication emails (verification, password reset)
- ✅ **Custom database templates** are used for business emails (welcome, orders)
- ✅ **Two separate systems** - don't confuse them!
- ✅ **Customize Supabase templates** in the dashboard
- ✅ **Customize app templates** in the database or via API

