-- Create artisan_services table
CREATE TABLE IF NOT EXISTS public.artisan_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  fixed_price DECIMAL(10, 2),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('hourly', 'daily', 'fixed', 'negotiable')),
  location TEXT,
  service_area TEXT[] DEFAULT ARRAY[]::TEXT[],
  portfolio_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create artisan_bookings table
CREATE TABLE IF NOT EXISTS public.artisan_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.artisan_services(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.artisan_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for artisan_services
CREATE POLICY "Anyone can view available artisan services"
  ON public.artisan_services FOR SELECT
  USING (true);

CREATE POLICY "Artisans can insert their own services"
  ON public.artisan_services FOR INSERT
  WITH CHECK (
    auth.uid() = artisan_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'artisan'
    )
  );

CREATE POLICY "Artisans can update their own services"
  ON public.artisan_services FOR UPDATE
  USING (auth.uid() = artisan_id);

CREATE POLICY "Artisans can delete their own services"
  ON public.artisan_services FOR DELETE
  USING (auth.uid() = artisan_id);

-- RLS Policies for artisan_bookings
CREATE POLICY "Users can view their own bookings"
  ON public.artisan_bookings FOR SELECT
  USING (
    auth.uid() = artisan_id 
    OR auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Clients can create bookings"
  ON public.artisan_bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Artisans and clients can update bookings"
  ON public.artisan_bookings FOR UPDATE
  USING (
    auth.uid() = artisan_id 
    OR auth.uid() = client_id
  );

-- Create updated_at triggers
CREATE TRIGGER update_artisan_services_updated_at
  BEFORE UPDATE ON public.artisan_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artisan_bookings_updated_at
  BEFORE UPDATE ON public.artisan_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_artisan_services_artisan_id ON public.artisan_services(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_services_category ON public.artisan_services(category);
CREATE INDEX IF NOT EXISTS idx_artisan_services_is_available ON public.artisan_services(is_available);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_artisan_id ON public.artisan_bookings(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_client_id ON public.artisan_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_service_id ON public.artisan_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_status ON public.artisan_bookings(status);

