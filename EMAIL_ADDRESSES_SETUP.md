# Email Addresses Configuration Guide

This guide explains how to set up multiple email addresses for different purposes in BLINNO.

## Available Email Addresses

The system supports the following email addresses:

| Email Address | Purpose | Used For |
|--------------|---------|----------|
| `onboarding@blinno.com` | Onboarding & Welcome | Welcome emails, new user onboarding |
| `support@blinno.com` | Customer Support | Notifications, customer service emails |
| `finance@blinno.com` | Financial & Payments | Order confirmations, payment receipts, invoices |
| `orders@blinno.com` | Orders & Transactions | Order updates, shipping notifications |
| `security@blinno.com` | Security & Auth | Password resets, security alerts, 2FA |
| `marketing@blinno.com` | Marketing | Newsletters, promotions, announcements |
| `system@blinno.com` | System Notifications | Automated system messages |
| `noreply@blinno.com` | No Reply | Default for automated emails |

## Setup Instructions

### 1. Verify Your Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain: `blinno.com`
4. Add the required DNS records:
   - **SPF Record**: `v=spf1 include:resend.com ~all`
   - **DKIM Record**: (provided by Resend)
   - **DMARC Record**: `v=DMARC1; p=none; rua=mailto:dmarc@blinno.com`
5. Wait for verification (usually takes a few minutes)

### 2. Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Default email (fallback)
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.com>

# Onboarding emails
RESEND_ONBOARDING_EMAIL=BLINNO <onboarding@blinno.com>

# Support emails
RESEND_SUPPORT_EMAIL=BLINNO Support <support@blinno.com>

# Finance emails
RESEND_FINANCE_EMAIL=BLINNO Finance <finance@blinno.com>

# Order emails
RESEND_ORDERS_EMAIL=BLINNO Orders <orders@blinno.com>

# Security emails
RESEND_SECURITY_EMAIL=BLINNO Security <security@blinno.com>

# Marketing emails
RESEND_MARKETING_EMAIL=BLINNO <marketing@blinno.com>

# System emails
RESEND_SYSTEM_EMAIL=BLINNO <system@blinno.com>
```

**Note:** All email addresses must be on your verified domain. Once your domain is verified in Resend, you can use any email address on that domain.

### 3. Email Address Usage

The system automatically selects the appropriate sender based on email type:

#### Onboarding Emails
- **Sender:** `onboarding@blinno.com`
- **Reply-To:** `support@blinno.com`
- **Used for:**
  - Welcome emails
  - New user onboarding
  - Getting started guides

#### Support Emails
- **Sender:** `support@blinno.com`
- **Reply-To:** `support@blinno.com`
- **Used for:**
  - General notifications
  - Customer service communications
  - Help and support messages

#### Finance Emails
- **Sender:** `finance@blinno.com`
- **Reply-To:** `finance@blinno.com`
- **Used for:**
  - Payment confirmations
  - Invoice emails
  - Refund notifications
  - Payout notifications

#### Order Emails
- **Sender:** `orders@blinno.com`
- **Reply-To:** `finance@blinno.com`
- **Used for:**
  - Order confirmations
  - Order status updates
  - Shipping notifications

#### Security Emails
- **Sender:** `security@blinno.com`
- **Reply-To:** `support@blinno.com`
- **Used for:**
  - Password reset emails
  - Security alerts
  - 2FA setup/verification
  - Account security notifications

#### Marketing Emails
- **Sender:** `marketing@blinno.com`
- **Reply-To:** `marketing@blinno.com`
- **Used for:**
  - Newsletters
  - Promotional emails
  - Product announcements

#### System Emails
- **Sender:** `system@blinno.com`
- **Reply-To:** `support@blinno.com`
- **Used for:**
  - Automated system messages
  - Maintenance notifications
  - System alerts

## Code Usage

### Automatic Email Type Selection

The email service automatically selects the sender based on the email type:

```typescript
// Welcome email - uses onboarding@blinno.com
await sendWelcomeEmail('user@example.com', 'John Doe');

// Order confirmation - uses orders@blinno.com
await sendOrderConfirmationEmail('user@example.com', 'order-123', 99.99, items);

// Notification - uses support@blinno.com
await sendNotificationEmail('user@example.com', 'Title', 'Message');

// Password reset - uses security@blinno.com
await sendPasswordResetEmail('user@example.com', 'reset-token');
```

### Manual Email Type Selection

You can specify the email type when sending emails:

```typescript
// Send email with specific type
await sendEmail({
  to: 'user@example.com',
  subject: 'Payment Receipt',
  html: '<p>Your payment was received</p>',
  emailType: 'finance', // Uses finance@blinno.com
});

// Send templated email with specific type
await sendTemplatedEmail('invoice', 'user@example.com', {
  invoiceNumber: 'INV-123',
}, {
  emailType: 'finance',
  replyTo: EMAIL_ADDRESSES.finance,
});
```

### Override Sender Address

You can override the sender address if needed:

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Custom Email',
  html: '<p>Content</p>',
  from: 'custom@blinno.com', // Override default
});
```

## Email Address Best Practices

### 1. Use Appropriate Addresses
- Use `onboarding@` for welcome and setup emails
- Use `support@` for customer service
- Use `finance@` for payment-related emails
- Use `security@` for authentication and security

### 2. Set Reply-To Addresses
- Set `replyTo` to `support@blinno.com` for emails where users might need help
- Set `replyTo` to `finance@blinno.com` for payment/order inquiries
- Use the same address as sender for marketing emails

### 3. Monitor Email Addresses
- Set up email forwarding for `support@blinno.com` to your support team
- Set up email forwarding for `finance@blinno.com` to your finance team
- Monitor bounce rates for each address in Resend dashboard

### 4. Domain Verification
- Ensure your domain is fully verified in Resend
- All addresses on a verified domain can be used automatically
- No need to verify each individual address

## Testing

### Test Each Email Address

1. **Test Onboarding:**
   ```bash
   POST /api/auth/register
   # Should receive welcome email from onboarding@blinno.com
   ```

2. **Test Support:**
   ```bash
   # Create a notification with email enabled
   # Should receive email from support@blinno.com
   ```

3. **Test Finance:**
   ```bash
   # Place an order
   # Should receive confirmation from orders@blinno.com
   ```

4. **Test Security:**
   ```bash
   POST /api/auth/forgot-password
   # Should receive email from security@blinno.com
   ```

## Troubleshooting

### Emails Not Sending

1. **Check Domain Verification:**
   - Go to Resend dashboard → Domains
   - Ensure domain is verified (green checkmark)
   - Check DNS records are correct

2. **Check Environment Variables:**
   - Verify all email addresses are set in `.env`
   - Ensure addresses use your verified domain
   - Restart backend server after changes

3. **Check Resend Dashboard:**
   - Go to Resend dashboard → Emails
   - Check for error messages
   - Verify emails are being sent

### Invalid Sender Address

If you see "Invalid sender address" errors:

1. Ensure domain is verified in Resend
2. Check email address format: `Name <email@domain.com>`
3. Verify the address is on your verified domain
4. Check for typos in environment variables

## Next Steps

1. ✅ Configure email addresses in environment variables
2. ✅ Verify domain in Resend
3. ✅ Test each email type
4. ⏳ Set up email forwarding for support/finance addresses
5. ⏳ Configure email monitoring and alerts
6. ⏳ Set up bounce handling
7. ⏳ Create email templates for each type

## Resources

- [Resend Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
- [Resend Email Best Practices](https://resend.com/docs/send-with-nodejs)
- [Email Deliverability Guide](https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability)

