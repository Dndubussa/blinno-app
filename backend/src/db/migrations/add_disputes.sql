-- Dispute Resolution System
-- Comprehensive dispute management for marketplace transactions

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN (
    'order', 'booking', 'payment', 'service_quality', 'item_not_received',
    'item_damaged', 'wrong_item', 'refund_not_received', 'other'
  )),
  initiator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  respondent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed', 'escalated')),
  resolution TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispute evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispute messages table (for communication within dispute)
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Admin-only messages
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_initiator_id ON disputes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent_id ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);

