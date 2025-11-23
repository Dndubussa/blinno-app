-- Content Moderation System
-- Automated and manual content moderation

-- Moderation reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'product', 'portfolio', 'post', 'comment', 'review', 'message', 'profile', 'event'
  )),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed', 'escalated')),
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Content moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES moderation_reports(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warn', 'hide', 'delete', 'suspend_user', 'ban_user', 'no_action'
  )),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  duration_days INTEGER, -- For temporary suspensions
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Automated moderation rules table
CREATE TABLE IF NOT EXISTS moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'pattern', 'image', 'spam')),
  pattern TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('flag', 'hide', 'delete', 'require_review')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_moderation_reports_content ON moderation_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_content ON moderation_actions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_rules_active ON moderation_rules(is_active);

