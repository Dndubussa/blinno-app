-- Email Templates System
-- Manageable email templates for notifications

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- Available variables for this template
  category TEXT, -- e.g., 'order', 'payment', 'booking', 'system'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Email template usage log
CREATE TABLE IF NOT EXISTS email_template_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  variables_used JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_template_logs_template_id ON email_template_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_logs_created_at ON email_template_logs(created_at);

-- Insert default email templates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'order_placed') THEN
    INSERT INTO email_templates (name, subject, body_html, body_text, category, variables) VALUES
    ('order_placed', 'Order Confirmation - Order #{{order_id}}', '<h1>Thank you for your order!</h1><p>Your order #{{order_id}} has been placed successfully.</p><p>Total: {{total_amount}} {{currency}}</p>', 'Thank you for your order! Your order #{{order_id}} has been placed successfully. Total: {{total_amount}} {{currency}}', 'order', '{"order_id": "string", "total_amount": "number", "currency": "string"}'::jsonb),
    ('order_shipped', 'Your Order #{{order_id}} Has Shipped', '<h1>Your order is on the way!</h1><p>Order #{{order_id}} has been shipped.</p><p>Tracking: {{tracking_number}}</p>', 'Your order #{{order_id}} has been shipped. Tracking: {{tracking_number}}', 'order', '{"order_id": "string", "tracking_number": "string"}'::jsonb),
    ('payment_received', 'Payment Received - {{amount}} {{currency}}', '<h1>Payment Received</h1><p>Your payment of {{amount}} {{currency}} has been received successfully.</p>', 'Your payment of {{amount}} {{currency}} has been received successfully.', 'payment', '{"amount": "number", "currency": "string"}'::jsonb),
    ('booking_confirmed', 'Booking Confirmed - {{service_type}}', '<h1>Booking Confirmed</h1><p>Your booking for {{service_type}} has been confirmed.</p><p>Date: {{start_date}}</p>', 'Your booking for {{service_type}} has been confirmed. Date: {{start_date}}', 'booking', '{"service_type": "string", "start_date": "string"}'::jsonb),
    ('review_received', 'New Review from {{reviewer_name}}', '<h1>You received a new review!</h1><p>{{reviewer_name}} left you a {{rating}}-star review.</p><p>{{comment}}</p>', 'You received a new review from {{reviewer_name}}. Rating: {{rating}} stars. Comment: {{comment}}', 'review', '{"reviewer_name": "string", "rating": "number", "comment": "string"}'::jsonb);
  END IF;
END $$;

