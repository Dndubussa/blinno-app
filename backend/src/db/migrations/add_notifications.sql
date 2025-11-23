-- Notifications System
-- Comprehensive notification system for the platform

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled',
    'payment_received', 'payment_failed', 'payment_refunded',
    'booking_requested', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
    'message_received', 'message_read',
    'review_received', 'review_updated',
    'payout_requested', 'payout_processed', 'payout_completed',
    'subscription_active', 'subscription_expiring', 'subscription_expired',
    'refund_requested', 'refund_approved', 'refund_rejected',
    'dispute_opened', 'dispute_resolved',
    'product_sold', 'product_low_stock',
    'system_announcement', 'feature_update'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data (order_id, booking_id, etc.)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}'::jsonb, -- Per-type preferences
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Email notifications log (for tracking sent emails)
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- SMS notifications log
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

