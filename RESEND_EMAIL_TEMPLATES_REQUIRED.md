# Required Email Templates for Resend

This document lists all email templates that need to be configured in Resend for the BLINNO platform.

## Important Note

The BLINNO platform uses **two methods** for sending emails:

1. **Resend API (Direct HTML)** - Custom application emails sent via Resend API with HTML from database
2. **Supabase Auth Templates** - Authentication emails sent via Supabase's SMTP (configured to use Resend)

## Email Templates Required

### 1. Authentication & Security Templates (Supabase Auth)

These templates are configured in **Supabase Dashboard** → **Authentication** → **Email Templates**, but emails are sent through Resend SMTP:

#### a. Email Verification (Confirm Signup)
- **Template ID**: `confirm_signup`
- **Purpose**: Sent when a user signs up to verify their email address
- **Variables Available**:
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Verification token
  - `{{ .ConfirmationURL }}` - Full confirmation URL
  - `{{ .SiteURL }}` - Base site URL
  - `{{ .RedirectTo }}` - Redirect URL after verification
- **Sender**: Configured in Supabase SMTP settings (via Resend)

#### b. Password Reset
- **Template ID**: `reset_password`
- **Purpose**: Sent when a user requests a password reset
- **Variables Available**:
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Reset token
  - `{{ .ConfirmationURL }}` - Full reset URL
  - `{{ .SiteURL }}` - Base site URL
  - `{{ .RedirectTo }}` - Redirect URL after reset
- **Sender**: Configured in Supabase SMTP settings (via Resend)

#### c. Magic Link Login
- **Template ID**: `magic_link`
- **Purpose**: Sent when a user requests a passwordless login link
- **Variables Available**:
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Magic link token
  - `{{ .ConfirmationURL }}` - Full magic link URL
  - `{{ .SiteURL }}` - Base site URL
  - `{{ .RedirectTo }}` - Redirect URL after login
- **Sender**: Configured in Supabase SMTP settings (via Resend)

#### d. Email Change Confirmation
- **Template ID**: `change_email`
- **Purpose**: Sent when a user requests to change their email address
- **Variables Available**:
  - `{{ .Email }}` - Current email address
  - `{{ .Token }}` - Confirmation token
  - `{{ .ConfirmationURL }}` - Full confirmation URL
  - `{{ .SiteURL }}` - Base site URL
- **Sender**: Configured in Supabase SMTP settings (via Resend)

#### e. Re-authentication Request
- **Template ID**: `reauthentication`
- **Purpose**: Sent when additional verification is required for sensitive actions
- **Variables Available**:
  - `{{ .Email }}` - User's email address
  - `{{ .Token }}` - Re-authentication token
  - `{{ .ConfirmationURL }}` - Full re-authentication URL
  - `{{ .SiteURL }}` - Base site URL
- **Sender**: Configured in Supabase SMTP settings (via Resend)

---

### 2. Application Email Templates (Resend API)

These templates are stored in the database (`email_templates` table) and sent via Resend API. If you want to use Resend's template feature instead, you would need to create these in Resend Dashboard:

#### a. Welcome/Onboarding Email
- **Template Name**: `welcome`
- **Category**: `onboarding`
- **Purpose**: Sent to new users after successful registration
- **Sender**: `onboarding@blinno.com` (or configured `RESEND_ONBOARDING_EMAIL`)
- **Reply-To**: `support@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{dashboard_url}}` - Link to the user's dashboard
  - `{{unsubscribe_url}}` - Link to unsubscribe from marketing emails
  - `{{preferences_url}}` - Link to email preference settings
  - `{{platformName}}` - Platform name (BLINNO)
  - `{{platformUrl}}` - Platform URL

#### b. Email Confirmation (Custom)
- **Template Name**: `email_confirmation`
- **Category**: `security`
- **Purpose**: Custom email confirmation (alternative to Supabase template)
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{confirmation_url}}` - Link to confirm the email address

#### c. Password Reset (Custom)
- **Template Name**: `password_reset`
- **Category**: `security`
- **Purpose**: Custom password reset email (alternative to Supabase template)
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{reset_url}}` - Link to reset the password
  - `{{platformName}}` - Platform name (BLINNO)

#### d. Account Verification
- **Template Name**: `account_verification`
- **Category**: `security`
- **Purpose**: Sent to verify a user's account after registration
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{verification_url}}` - Link to verify the account

#### e. User Invitation
- **Template Name**: `invite_user`
- **Category**: `security`
- **Purpose**: Sent to invite users to join the platform or a specific team/organization
- **Sender**: `support@blinno.com`
- **Variables**:
  - `{{inviter_name}}` - Name of the person who sent the invitation
  - `{{team_name}}` - Name of the team/organization
  - `{{role}}` - Role that will be assigned to the invited user
  - `{{invite_url}}` - Link to accept the invitation

#### f. Magic Link Login (Custom)
- **Template Name**: `magic_link`
- **Category**: `security`
- **Purpose**: Custom magic link email (alternative to Supabase template)
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{magic_link_url}}` - Secure login link

#### g. Email Change Confirmation (Custom)
- **Template Name**: `change_email`
- **Category**: `security`
- **Purpose**: Custom email change confirmation
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{current_email}}` - Current email address
  - `{{new_email}}` - New email address to be confirmed
  - `{{request_time}}` - Timestamp of the request
  - `{{confirmation_url}}` - Link to confirm the email change
  - `{{cancel_url}}` - Link to cancel the email change

#### h. Re-authentication Request (Custom)
- **Template Name**: `reauthentication`
- **Category**: `security`
- **Purpose**: Custom re-authentication email
- **Sender**: `security@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{action_description}}` - Description of the action requiring verification
  - `{{timestamp}}` - Time of the request
  - `{{location}}` - Location/IP address of the request (if available)
  - `{{reauth_url}}` - Link to verify identity

#### i. Order Confirmation
- **Template Name**: `order_placed`
- **Category**: `order`
- **Purpose**: Sent after a user successfully places an order
- **Sender**: `orders@blinno.com`
- **Reply-To**: `finance@blinno.com`
- **Variables**:
  - `{{customer_name}}` - The customer's name
  - `{{order_id}}` - Unique order identifier
  - `{{order_date}}` - Date the order was placed
  - `{{order_items}}` - Array of items in the order (formatted as string)
  - `{{order_total}}` - Total amount of the order
  - `{{order_url}}` - Link to view order details

#### j. Payment Confirmation
- **Template Name**: `payment_received`
- **Category**: `payment`
- **Purpose**: Sent after a payment is successfully processed
- **Sender**: `finance@blinno.com`
- **Variables**:
  - `{{customer_name}}` - The customer's name
  - `{{order_id}}` - Unique order identifier
  - `{{payment_date}}` - Date the payment was processed
  - `{{payment_method}}` - Payment method used (e.g., "Credit Card", "Mobile Money")
  - `{{transaction_id}}` - Payment transaction identifier
  - `{{amount}}` - Payment amount
  - `{{order_url}}` - Link to view order details

#### k. Subscription Confirmation
- **Template Name**: `subscription_confirmation`
- **Category**: `subscription`
- **Purpose**: Sent after a user successfully subscribes to a plan
- **Sender**: `finance@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{plan_name}}` - Name of the subscription plan
  - `{{billing_cycle}}` - Billing frequency (e.g., "Monthly", "Yearly")
  - `{{amount}}` - Subscription amount
  - `{{start_date}}` - Subscription start date
  - `{{next_billing_date}}` - Next billing date
  - `{{payment_method}}` - Payment method used
  - `{{plan_features}}` - Array of features included in the plan
  - `{{dashboard_url}}` - Link to the user's dashboard

#### l. Notification Email
- **Template Name**: `notification`
- **Category**: `notification`
- **Purpose**: Generic notification template for various platform events
- **Sender**: `support@blinno.com` (default, can be customized)
- **Reply-To**: `support@blinno.com`
- **Variables**:
  - `{{user_name}}` - The user's display name
  - `{{notification_title}}` - Title of the notification
  - `{{notification_subtitle}}` - Subtitle of the notification
  - `{{notification_message}}` - Main notification message
  - `{{action_url}}` - Optional link for user action
  - `{{action_text}}` - Text for the action button/link
  - `{{preferences_url}}` - Link to email preference settings
  - `{{unsubscribe_url}}` - Link to unsubscribe from notifications

---

## Email Addresses Required in Resend

All these email addresses must be **verified in Resend** (either as individual addresses or as part of a verified domain):

### Required Email Addresses:

1. **`noreply@blinno.com`** (or your domain)
   - Default sender for most emails
   - Environment variable: `RESEND_FROM_EMAIL`

2. **`onboarding@blinno.com`**
   - Welcome and onboarding emails
   - Environment variable: `RESEND_ONBOARDING_EMAIL`

3. **`support@blinno.com`**
   - Support emails and notifications
   - Environment variable: `RESEND_SUPPORT_EMAIL`

4. **`finance@blinno.com`**
   - Payment and subscription emails
   - Environment variable: `RESEND_FINANCE_EMAIL`

5. **`orders@blinno.com`**
   - Order confirmation emails
   - Environment variable: `RESEND_ORDERS_EMAIL`

6. **`security@blinno.com`**
   - Security and authentication emails
   - Environment variable: `RESEND_SECURITY_EMAIL`

7. **`marketing@blinno.com`**
   - Marketing and newsletter emails
   - Environment variable: `RESEND_MARKETING_EMAIL`

8. **`system@blinno.com`**
   - System and automated notifications
   - Environment variable: `RESEND_SYSTEM_EMAIL`

---

## Setup Instructions

### Option 1: Using Resend API with Database Templates (Current Implementation)

The platform currently stores templates in the database and sends HTML directly via Resend API. **No templates need to be created in Resend Dashboard** for this approach.

**Requirements:**
1. ✅ Verify all email addresses in Resend
2. ✅ Set up Resend API key in environment variables
3. ✅ Seed email templates in database (run `npm run seed:email-templates`)
4. ✅ Configure Supabase SMTP to use Resend (for auth emails)

### Option 2: Using Resend Templates Feature

If you want to use Resend's template feature instead:

1. **Create Templates in Resend Dashboard:**
   - Go to Resend Dashboard → Templates
   - Create each template listed above
   - Use the same template names and variables

2. **Update Code:**
   - Modify `emailService.ts` to use Resend template IDs instead of HTML
   - Example: `resend.emails.send({ template_id: 'welcome', ... })`

3. **Benefits:**
   - Templates managed in Resend Dashboard
   - Version control for templates
   - Easier template updates without code changes

---

## Supabase SMTP Configuration (For Auth Emails)

To send Supabase Auth emails through Resend:

1. **In Supabase Dashboard:**
   - Go to **Project Settings** → **Authentication** → **SMTP Settings**
   - Enable SMTP
   - Configure:
     - **Host**: `smtp.resend.com`
     - **Port**: `587` (or `465` for SSL)
     - **Username**: `resend`
     - **Password**: Your Resend API key (starts with `re_`)
     - **Sender Email**: One of your verified Resend addresses

2. **Configure Email Templates:**
   - Go to **Project Settings** → **Authentication** → **Email Templates**
   - Customize each template (confirm_signup, reset_password, etc.)
   - Use Supabase template variables: `{{ .Email }}`, `{{ .Token }}`, etc.

---

## Testing

### Test Email Sending

```bash
# Test Resend API connection
cd backend
npm run test:resend-config

# Test email template loading
npm run test:template-loading

# Test sending welcome email
npm run test:onboarding-email
```

### Test Supabase Auth Emails

1. Register a new user → Should receive verification email
2. Request password reset → Should receive reset email
3. Check Resend Dashboard → **Emails** tab for delivery status

---

## Environment Variables Required

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.com>
RESEND_ONBOARDING_EMAIL=BLINNO <onboarding@blinno.com>
RESEND_SUPPORT_EMAIL=BLINNO Support <support@blinno.com>
RESEND_FINANCE_EMAIL=BLINNO Finance <finance@blinno.com>
RESEND_ORDERS_EMAIL=BLINNO Orders <orders@blinno.com>
RESEND_SECURITY_EMAIL=BLINNO Security <security@blinno.com>
RESEND_MARKETING_EMAIL=BLINNO <marketing@blinno.com>
RESEND_SYSTEM_EMAIL=BLINNO <system@blinno.com>

# Application URL (for email links)
APP_URL=https://www.blinno.app
```

---

## Summary

### Templates Needed in Resend Dashboard:
- **None** (if using current database template approach)
- **12 templates** (if switching to Resend template feature)

### Email Addresses to Verify in Resend:
- ✅ `noreply@blinno.com`
- ✅ `onboarding@blinno.com`
- ✅ `support@blinno.com`
- ✅ `finance@blinno.com`
- ✅ `orders@blinno.com`
- ✅ `security@blinno.com`
- ✅ `marketing@blinno.com`
- ✅ `system@blinno.com`

### Supabase Templates to Configure:
- ✅ `confirm_signup` (Email Verification)
- ✅ `reset_password` (Password Reset)
- ✅ `magic_link` (Magic Link Login)
- ✅ `change_email` (Email Change)
- ✅ `reauthentication` (Re-authentication)

---

## Next Steps

1. **Verify all email addresses** in Resend Dashboard
2. **Set up Resend API key** in environment variables
3. **Configure Supabase SMTP** to use Resend
4. **Seed email templates** in database: `npm run seed:email-templates`
5. **Test email sending** using the test scripts
6. **Monitor email delivery** in Resend Dashboard

For more details, see:
- `EMAIL_TEMPLATES.md` - Complete template documentation
- `RESEND_SETUP.md` - Resend integration guide
- `SUPABASE_RESEND_INTEGRATION.md` - Dual integration details

