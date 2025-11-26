# BLINNO Email Templates

This directory contains HTML and plain text email templates used by the BLINNO platform.

## Available Templates

### 1. Welcome/Onboarding (`welcome.html` / `welcome.txt`)
- **Purpose**: Sent to new users after registration
- **Variables**:
  - `user_name`: The user's name
  - `dashboard_url`: Link to user's dashboard
  - `unsubscribe_url`: Link to unsubscribe from emails
  - `preferences_url`: Link to email preferences

### 2. Email Confirmation (`email_confirmation.html`)
- **Purpose**: Sent to verify a user's email address
- **Variables**:
  - `user_name`: The user's name
  - `confirmation_url`: Link to confirm email address

### 3. Password Reset (`password_reset.html`)
- **Purpose**: Sent when a user requests a password reset
- **Variables**:
  - `user_name`: The user's name
  - `reset_url`: Link to reset password

### 4. Order Confirmation (`order_confirmation.html`)
- **Purpose**: Sent after a user places an order
- **Variables**:
  - `customer_name`: The customer's name
  - `order_id`: The order ID
  - `order_date`: Date the order was placed
  - `order_items`: Array of items in the order
  - `order_total`: Total amount of the order
  - `order_url`: Link to view order details

### 5. Payment Confirmation (`payment_confirmation.html`)
- **Purpose**: Sent after a payment is processed
- **Variables**:
  - `customer_name`: The customer's name
  - `order_id`: The order ID
  - `payment_date`: Date the payment was processed
  - `payment_method`: Payment method used
  - `transaction_id`: Payment transaction ID
  - `amount`: Payment amount
  - `order_url`: Link to view order details

### 6. Subscription Confirmation (`subscription_confirmation.html`)
- **Purpose**: Sent after a user subscribes to a plan
- **Variables**:
  - `user_name`: The user's name
  - `plan_name`: Name of the subscription plan
  - `billing_cycle`: Billing frequency (monthly, yearly, etc.)
  - `amount`: Subscription amount
  - `start_date`: Subscription start date
  - `next_billing_date`: Next billing date
  - `payment_method`: Payment method used
  - `plan_features`: Array of plan features
  - `dashboard_url`: Link to user's dashboard

### 7. Notification (`notification.html`)
- **Purpose**: General notification template for various platform events
- **Variables**:
  - `user_name`: The user's name
  - `notification_title`: Title of the notification
  - `notification_subtitle`: Subtitle of the notification
  - `notification_message`: Main notification message
  - `action_url`: Optional link for user action
  - `action_text`: Text for the action button
  - `preferences_url`: Link to email preferences
  - `unsubscribe_url`: Link to unsubscribe from emails

## Seeding Templates

To seed these templates into the database:

```bash
npm run seed:email-templates
```

This script will:
1. Read all HTML and text template files
2. Insert or update templates in the `email_templates` database table
3. Associate appropriate variables with each template

## Template Variables

All templates use Handlebars-style variable syntax: `{{variable_name}}`

Some templates also use Handlebars helpers:
- `{{#each array}}...{{/each}}` for iterating over arrays
- `{{{variable}}}` for unescaped HTML content

## Customization

To customize templates:
1. Edit the HTML files directly
2. Update corresponding text versions if needed
3. Run the seed script to update the database

## Testing

To test email templates:
1. Use the email template preview API endpoint
2. Send test emails through the admin interface
3. Verify rendering in different email clients

## Best Practices

1. **Mobile Responsive**: All templates are designed to work on mobile devices
2. **Plain Text Alternatives**: Provide text versions for better deliverability
3. **Branding Consistency**: Use consistent colors and typography
4. **Accessibility**: Ensure proper contrast and semantic HTML
5. **Performance**: Optimize images and minimize CSS