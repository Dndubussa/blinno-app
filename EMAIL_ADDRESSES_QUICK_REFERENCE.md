# Email Addresses Quick Reference

## Quick Setup

Add to `backend/.env`:

```env
# Default
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.com>

# Specific addresses
RESEND_ONBOARDING_EMAIL=BLINNO <onboarding@blinno.com>
RESEND_SUPPORT_EMAIL=BLINNO Support <support@blinno.com>
RESEND_FINANCE_EMAIL=BLINNO Finance <finance@blinno.com>
RESEND_ORDERS_EMAIL=BLINNO Orders <orders@blinno.com>
RESEND_SECURITY_EMAIL=BLINNO Security <security@blinno.com>
RESEND_MARKETING_EMAIL=BLINNO <marketing@blinno.com>
RESEND_SYSTEM_EMAIL=BLINNO <system@blinno.com>
```

## Email Type Mapping

| Email Type | Sender Address | Reply-To | Used For |
|------------|---------------|----------|----------|
| `onboarding` | `onboarding@blinno.com` | `support@blinno.com` | Welcome emails, onboarding |
| `support` | `support@blinno.com` | `support@blinno.com` | Notifications, customer service |
| `finance` | `finance@blinno.com` | `finance@blinno.com` | Payments, invoices, refunds |
| `orders` | `orders@blinno.com` | `finance@blinno.com` | Order confirmations, shipping |
| `security` | `security@blinno.com` | `support@blinno.com` | Password resets, 2FA, security alerts |
| `marketing` | `marketing@blinno.com` | `marketing@blinno.com` | Newsletters, promotions |
| `system` | `system@blinno.com` | `support@blinno.com` | System notifications |
| `default` | `noreply@blinno.com` | (none) | Fallback |

## Usage Examples

```typescript
// Automatic type selection
await sendWelcomeEmail('user@example.com', 'John'); 
// → from: onboarding@blinno.com

await sendOrderConfirmationEmail('user@example.com', 'order-123', 99.99, items);
// → from: orders@blinno.com

await sendPasswordResetEmail('user@example.com', 'token');
// → from: security@blinno.com

// Manual type selection
await sendEmail({
  to: 'user@example.com',
  subject: 'Invoice',
  html: '<p>Your invoice</p>',
  emailType: 'finance', // Uses finance@blinno.com
});

// Override sender
await sendEmail({
  to: 'user@example.com',
  subject: 'Custom',
  html: '<p>Content</p>',
  from: 'custom@blinno.com', // Override
});
```

## Important Notes

1. **Domain Verification Required**: All addresses must be on a domain verified in Resend
2. **No Individual Verification**: Once domain is verified, all addresses on that domain work
3. **Reply-To**: Automatically set based on email type (support for most, finance for orders)
4. **Fallback**: If type not specified, uses `noreply@blinno.com`

For detailed setup instructions, see [EMAIL_ADDRESSES_SETUP.md](./EMAIL_ADDRESSES_SETUP.md)

