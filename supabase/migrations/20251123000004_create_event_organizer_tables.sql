-- Create events table (if not exists, extend existing bookings/events structure)
CREATE TABLE IF NOT EXISTS public.organized_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  city TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  start_time TIME NOT NULL,
  end_time TIME,
  cover_image_url TEXT,
  ticket_price DECIMAL(10, 2),
  ticket_url TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.organized_events(id) ON DELETE CASCADE NOT NULL,
  attendee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_count INTEGER DEFAULT 1,
  total_amount DECIMAL(10, 2),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, attendee_id)
);

-- Enable RLS
ALTER TABLE public.organized_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organized_events
CREATE POLICY "Anyone can view published events"
  ON public.organized_events FOR SELECT
  USING (
    (is_published = true AND status = 'published')
    OR auth.uid() = organizer_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event organizers can insert their own events"
  ON public.organized_events FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'event_organizer'
    )
  );

CREATE POLICY "Event organizers can update their own events"
  ON public.organized_events FOR UPDATE
  USING (
    auth.uid() = organizer_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event organizers can delete their own events"
  ON public.organized_events FOR DELETE
  USING (
    auth.uid() = organizer_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for event_registrations
CREATE POLICY "Organizers and attendees can view registrations"
  ON public.event_registrations FOR SELECT
  USING (
    auth.uid() = attendee_id
    OR EXISTS (
      SELECT 1 FROM public.organized_events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = attendee_id);

CREATE POLICY "Organizers and attendees can update registrations"
  ON public.event_registrations FOR UPDATE
  USING (
    auth.uid() = attendee_id
    OR EXISTS (
      SELECT 1 FROM public.organized_events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_organized_events_updated_at
  BEFORE UPDATE ON public.organized_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organized_events_organizer_id ON public.organized_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organized_events_category ON public.organized_events(category);
CREATE INDEX IF NOT EXISTS idx_organized_events_start_date ON public.organized_events(start_date);
CREATE INDEX IF NOT EXISTS idx_organized_events_is_published ON public.organized_events(is_published);
CREATE INDEX IF NOT EXISTS idx_organized_events_status ON public.organized_events(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_attendee_id ON public.event_registrations(attendee_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);

