-- Seed default email templates for BLINNO platform (Supabase compatible)
-- This file creates the email_templates table and seeds default templates

-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    category VARCHAR(100),
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert or update email templates
INSERT INTO email_templates (name, subject, body_html, body_text, category, variables, is_active) VALUES
-- Welcome/Onboarding emails
('welcome', 'Welcome to BLINNO - Discover, Create & Connect', '<!-- Welcome email template -->', 'Welcome email template text version', 'onboarding', '{"user_name": "string", "dashboard_url": "string", "unsubscribe_url": "string", "preferences_url": "string"}', true),

-- Email confirmation
('email_confirmation', 'Confirm Your BLINNO Email Address', '<!-- Email confirmation template -->', NULL, 'security', '{"user_name": "string", "confirmation_url": "string"}', true),

-- Password reset
('password_reset', 'Reset Your BLINNO Password', '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #f97316;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 30px;
        }
        .content h2 {
            color: #f97316;
            font-size: 24px;
            margin-top: 0;
        }
        .content p {
            margin: 15px 0;
        }
        .button {
            display: inline-block;
            background-color: #f97316;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
        }
        .button:hover {
            background-color: #ea580c;
        }
        .security-note {
            background-color: #fff7ed;
            border-left: 4px solid #f97316;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
        }
        .footer a {
            color: #f97316;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
            <p>Reset your BLINNO account password</p>
        </div>
        
        <div class="content">
            <h2>Hello {{user_name}}!</h2>
            
            <p>We received a request to reset your password for your BLINNO account. If you made this request, please click the button below to reset your password:</p>
            
            <p style="text-align: center;">
                <a href="{{reset_url}}" class="button">Reset Password</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">{{reset_url}}</p>
            
            <div class="security-note">
                <p><strong>Security Note:</strong> This password reset link will expire in 1 hour. If you didn''t request a password reset, you can safely ignore this email. Your account password will not be changed.</p>
            </div>
            
            <p>For security reasons, we recommend:</p>
            <ul>
                <li>Using a strong password with at least 8 characters</li>
                <li>Using a mix of letters, numbers, and symbols</li>
                <li>Not reusing passwords from other accounts</li>
            </ul>
            
            <p>If you have any questions, our support team is here to help at <a href="mailto:support@blinno.app">support@blinno.app</a>.</p>
            
            <p>Best regards,<br>
            <strong>The BLINNO Security Team</strong></p>
        </div>
        
        <div class="footer">
            <p>
                BLINNO - BLISSFUL INNOVATIONS<br>
                Dar es Salaam, Tanzania
            </p>
            
            <p>© 2025 BLINNO. All rights reserved.</p>
        </div>
    </div>
</body>
</html>', NULL, 'security', '{"user_name": "string", "reset_url": "string"}', true),

-- Account verification
('account_verification', 'Verify Your BLINNO Account', '<!-- Account verification template -->', NULL, 'security', '{"user_name": "string", "verification_url": "string"}', true),

-- User invitation
('invite_user', 'You''ve Been Invited to Join BLINNO', '<!-- User invitation template -->', NULL, 'security', '{"inviter_name": "string", "team_name": "string", "role": "string", "invite_url": "string"}', true),

-- Magic link login
('magic_link', 'Secure Login Link for BLINNO', '<!-- Magic link template -->', NULL, 'security', '{"user_name": "string", "magic_link_url": "string"}', true),

-- Email change confirmation
('change_email', 'Confirm Email Change for Your BLINNO Account', '<!-- Email change template -->', NULL, 'security', '{"user_name": "string", "current_email": "string", "new_email": "string", "request_time": "string", "confirmation_url": "string", "cancel_url": "string"}', true),

-- Re-authentication request
('reauthentication', 'Re-authentication Required for BLINNO Account', '<!-- Re-authentication template -->', NULL, 'security', '{"user_name": "string", "action_description": "string", "timestamp": "string", "location": "string", "reauth_url": "string"}', true),

-- Order confirmation
('order_placed', 'Order Confirmation - Order #{{order_id}}', '<!-- Order confirmation template -->', NULL, 'order', '{"customer_name": "string", "order_id": "string", "order_date": "string", "order_items": "array", "order_total": "string", "order_url": "string"}', true),

-- Payment confirmation
('payment_received', 'Payment Received - {{amount}}', '<!-- Payment confirmation template -->', NULL, 'payment', '{"customer_name": "string", "order_id": "string", "payment_date": "string", "payment_method": "string", "transaction_id": "string", "amount": "string", "order_url": "string"}', true),

-- Subscription confirmation
('subscription_confirmation', 'BLINNO {{plan_name}} Subscription Confirmation', '<!-- Subscription confirmation template -->', NULL, 'subscription', '{"user_name": "string", "plan_name": "string", "billing_cycle": "string", "amount": "string", "start_date": "string", "next_billing_date": "string", "payment_method": "string", "plan_features": "array", "dashboard_url": "string"}', true),

-- Notification
('notification', '{{notification_title}}', '<!-- Notification template -->', NULL, 'notification', '{"user_name": "string", "notification_title": "string", "notification_subtitle": "string", "notification_message": "string", "action_url": "string", "action_text": "string", "preferences_url": "string", "unsubscribe_url": "string"}', true)

ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  category = EXCLUDED.category,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();