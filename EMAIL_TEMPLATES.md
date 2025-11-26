# BLINNO Email Templates System

This document provides comprehensive information about the email template system used in the BLINNO platform.

## Overview

The BLINNO platform uses a database-driven email template system that allows for customizable, manageable email communications. Templates are stored in the `email_templates` table and can be managed through the admin interface or directly in the database.

## Available Email Templates

### 1. Welcome/Onboarding Email
- **Template Name**: `welcome`
- **Purpose**: Sent to new users after successful registration
- **Category**: `onboarding`
- **Variables**:
  - `user_name`: The user's display name
  - `dashboard_url`: Link to the user's dashboard
  - `unsubscribe_url`: Link to unsubscribe from marketing emails
  - `preferences_url`: Link to email preference settings

### 2. Email Confirmation
- **Template Name**: `email_confirmation`
- **Purpose**: Sent to verify a user's email address during registration
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `confirmation_url`: Link to confirm the email address

### 3. Password Reset
- **Template Name**: `password_reset`
- **Purpose**: Sent when a user requests a password reset
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `reset_url`: Link to reset the password

### 4. Account Verification
- **Template Name**: `account_verification`
- **Purpose**: Sent to verify a user's account after registration
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `verification_url`: Link to verify the account

### 5. User Invitation
- **Template Name**: `invite_user`
- **Purpose**: Sent to invite users to join the platform or a specific team/organization
- **Category**: `security`
- **Variables**:
  - `inviter_name`: Name of the person who sent the invitation
  - `team_name`: Name of the team/organization the user is being invited to
  - `role`: Role that will be assigned to the invited user
  - `invite_url`: Link to accept the invitation

### 6. Magic Link Login
- **Template Name**: `magic_link`
- **Purpose**: Sent when a user requests a passwordless login link
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `magic_link_url`: Secure login link

### 7. Email Change Confirmation
- **Template Name**: `change_email`
- **Purpose**: Sent when a user requests to change their email address
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `current_email`: Current email address
  - `new_email`: New email address to be confirmed
  - `request_time`: Timestamp of the request
  - `confirmation_url`: Link to confirm the email change
  - `cancel_url`: Link to cancel the email change

### 8. Re-authentication Request
- **Template Name**: `reauthentication`
- **Purpose**: Sent when additional verification is required for sensitive actions
- **Category**: `security`
- **Variables**:
  - `user_name`: The user's display name
  - `action_description`: Description of the action requiring verification
  - `timestamp`: Time of the request
  - `location`: Location/IP address of the request (if available)
  - `reauth_url`: Link to verify identity

### 9. Order Confirmation
- **Template Name**: `order_placed`
- **Purpose**: Sent after a user successfully places an order
- **Category**: `order`
- **Variables**:
  - `customer_name`: The customer's name
  - `order_id`: Unique order identifier
  - `order_date`: Date the order was placed
  - `order_items`: Array of items in the order
  - `order_total`: Total amount of the order
  - `order_url`: Link to view order details

### 10. Payment Confirmation
- **Template Name**: `payment_received`
- **Purpose**: Sent after a payment is successfully processed
- **Category**: `payment`
- **Variables**:
  - `customer_name`: The customer's name
  - `order_id`: Unique order identifier
  - `payment_date`: Date the payment was processed
  - `payment_method`: Payment method used (e.g., "Credit Card", "Mobile Money")
  - `transaction_id`: Payment transaction identifier
  - `amount`: Payment amount
  - `order_url`: Link to view order details

### 11. Subscription Confirmation
- **Template Name**: `subscription_confirmation`
- **Purpose**: Sent after a user successfully subscribes to a plan
- **Category**: `subscription`
- **Variables**:
  - `user_name`: The user's display name
  - `plan_name`: Name of the subscription plan
  - `billing_cycle`: Billing frequency (e.g., "Monthly", "Yearly")
  - `amount`: Subscription amount
  - `start_date`: Subscription start date
  - `next_billing_date`: Next billing date
  - `payment_method`: Payment method used
  - `plan_features`: Array of features included in the plan
  - `dashboard_url`: Link to the user's dashboard

### 12. Notification
- **Template Name**: `notification`
- **Purpose**: Generic notification template for various platform events
- **Category**: `notification`
- **Variables**:
  - `user_name`: The user's display name
  - `notification_title`: Title of the notification
  - `notification_subtitle`: Subtitle of the notification
  - `notification_message`: Main notification message
  - `action_url`: Optional link for user action
  - `action_text`: Text for the action button/link
  - `preferences_url`: Link to email preference settings
  - `unsubscribe_url`: Link to unsubscribe from notifications

## Template Management

### Seeding Templates

To seed the default email templates into the database:

```bash
cd backend
npm run seed:email-templates
```

This script will:
1. Read all HTML and text template files from `backend/src/templates/emails/`
2. Insert or update templates in the `email_templates` database table
3. Associate appropriate variables with each template

### Testing Templates

To test that all templates can be loaded correctly:

```bash
cd backend
npm run test:template-loading
```

To test template processing with sample data:

```bash
cd backend
npm run test:email-templates
```

## Template Structure

### File Organization

Templates are stored in `backend/src/templates/emails/` with the following structure:
- HTML templates: `template_name.html`
- Plain text templates: `template_name.txt` (optional)

### Template Variables

All templates use Handlebars-style variable syntax: `{{variable_name}}`

Some templates also use Handlebars helpers:
- `{{#each array}}...{{/each}}` for iterating over arrays
- `{{{variable}}}` for unescaped HTML content

### Styling Guidelines

All HTML templates follow these styling guidelines:
- Mobile-responsive design
- Inline CSS for maximum email client compatibility
- Consistent color scheme using BLINNO brand colors
- Accessible contrast ratios
- Semantic HTML structure
- Minimal external dependencies

## Using Templates in Code

### Sending Templated Emails

To send an email using a template:

```typescript
import { sendTemplatedEmail } from '../services/emailService';

// Send welcome email
await sendTemplatedEmail('welcome', userEmail, {
  user_name: userName,
  dashboard_url: `https://www.blinno.app/dashboard`,
  unsubscribe_url: `https://www.blinno.app/unsubscribe`,
  preferences_url: `https://www.blinno.app/preferences`
}, {
  emailType: 'onboarding'
});
```

### Rendering Templates

To render a template with variables without sending:

```typescript
// Via API endpoint
POST /api/email-templates/:name/render
{
  "variables": {
    "user_name": "John Doe",
    "dashboard_url": "https://www.blinno.app/dashboard"
  }
}
```

## Customization

### Modifying Templates

To customize templates:
1. Edit the HTML files in `backend/src/templates/emails/`
2. Update corresponding text versions if needed
3. Run the seed script to update the database: `npm run seed:email-templates`

### Adding New Templates

To add a new template:
1. Create HTML template file in `backend/src/templates/emails/`
2. Optionally create a text version
3. Add template definition to `backend/src/scripts/seedEmailTemplates.js`
4. Run the seed script

### Template Categories

Templates are organized by category for easier management:
- `onboarding`: User registration and welcome emails
- `security`: Authentication and security-related emails
- `order`: Order placement and management emails
- `payment`: Payment confirmation and receipt emails
- `subscription`: Subscription and billing emails
- `notification`: General platform notifications

## Best Practices

### Design
1. **Mobile First**: All templates are designed for mobile devices
2. **Progressive Enhancement**: Core content should be readable without CSS
3. **Brand Consistency**: Use consistent colors, fonts, and spacing
4. **Accessibility**: Ensure proper contrast and semantic structure

### Technical
1. **Inline CSS**: Use inline styles for maximum email client compatibility
2. **Image Optimization**: Optimize images for fast loading
3. **Fallbacks**: Provide text alternatives for HTML content
4. **Testing**: Test templates across different email clients

### Content
1. **Clear CTAs**: Use clear, actionable call-to-action buttons
2. **Personalization**: Use user's name and relevant information
3. **Concise Messaging**: Keep content focused and scannable
4. **Legal Compliance**: Include unsubscribe links and company information

## Troubleshooting

### Common Issues

1. **Template Not Found**: Verify template name matches database entry
2. **Variable Not Replaced**: Check that variable names match exactly
3. **Email Not Sending**: Check Supabase and Resend configurations
4. **Styling Issues**: Ensure CSS is properly inlined

### Debugging

1. Check the `email_template_logs` table for send history
2. Verify template content in the `email_templates` table
3. Test template rendering via the API endpoint
4. Check Resend dashboard for delivery status

## Future Improvements

1. **Dynamic Content Blocks**: Allow for reusable content sections
2. **A/B Testing**: Support for testing different template versions
3. **Localization**: Multi-language template support
4. **Analytics Integration**: Track email engagement metrics
5. **Template Versioning**: Track changes to template content over time