-- Create digital_products table for artists/content creators to sell digital items
CREATE TABLE IF NOT EXISTS public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('artwork', 'photo', 'video', 'template', 'preset', 'ebook', 'music', 'other')),
  file_url TEXT NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  download_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create commissions table for custom work requests
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'review', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  deliverables TEXT[],
  reference_images TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create tips table for one-time donations/tips
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create subscriptions table for recurring payments
CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_name TEXT NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  benefits TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(creator_id, subscriber_id)
);

-- Create subscription_tiers table for creators to define their subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  benefits TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create performance_bookings table for actors/performers
CREATE TABLE IF NOT EXISTS public.performance_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  performance_type TEXT NOT NULL CHECK (performance_type IN ('acting', 'singing', 'dancing', 'comedy', 'hosting', 'other')),
  event_name TEXT,
  venue TEXT,
  performance_date TIMESTAMPTZ NOT NULL,
  duration_hours DECIMAL(4, 2),
  fee DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  requirements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create digital_product_purchases table
CREATE TABLE IF NOT EXISTS public.digital_product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(product_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digital_products
CREATE POLICY "Anyone can view active digital products"
  ON public.digital_products FOR SELECT
  USING (is_active = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own digital products"
  ON public.digital_products FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own digital products"
  ON public.digital_products FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own digital products"
  ON public.digital_products FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for commissions
CREATE POLICY "Creators and clients can view their commissions"
  ON public.commissions FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Clients can create commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Creators and clients can update commissions"
  ON public.commissions FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = client_id);

-- RLS Policies for tips
CREATE POLICY "Creators can view tips they received"
  ON public.tips FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR (auth.uid() = tipper_id AND is_anonymous = false)
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = tipper_id);

-- RLS Policies for creator_subscriptions
CREATE POLICY "Creators and subscribers can view subscriptions"
  ON public.creator_subscriptions FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = subscriber_id
  );

CREATE POLICY "Users can create subscriptions"
  ON public.creator_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Subscribers can update their subscriptions"
  ON public.creator_subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id);

-- RLS Policies for subscription_tiers
CREATE POLICY "Anyone can view active subscription tiers"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can manage their subscription tiers"
  ON public.subscription_tiers FOR ALL
  USING (auth.uid() = creator_id);

-- RLS Policies for performance_bookings
CREATE POLICY "Performers and clients can view bookings"
  ON public.performance_bookings FOR SELECT
  USING (
    auth.uid() = performer_id 
    OR auth.uid() = client_id
  );

CREATE POLICY "Clients can create performance bookings"
  ON public.performance_bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Performers and clients can update bookings"
  ON public.performance_bookings FOR UPDATE
  USING (auth.uid() = performer_id OR auth.uid() = client_id);

-- RLS Policies for digital_product_purchases
CREATE POLICY "Buyers and product creators can view purchases"
  ON public.digital_product_purchases FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR EXISTS (
      SELECT 1 FROM public.digital_products 
      WHERE id = product_id 
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can purchase digital products"
  ON public.digital_product_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Create updated_at triggers
CREATE TRIGGER update_digital_products_updated_at
  BEFORE UPDATE ON public.digital_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_subscriptions_updated_at
  BEFORE UPDATE ON public.creator_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_bookings_updated_at
  BEFORE UPDATE ON public.performance_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_digital_products_creator_id ON public.digital_products(creator_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_category ON public.digital_products(category);
CREATE INDEX IF NOT EXISTS idx_commissions_creator_id ON public.commissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_commissions_client_id ON public.commissions(client_id);
CREATE INDEX IF NOT EXISTS idx_tips_creator_id ON public.tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_id ON public.creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_id ON public.creator_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_creator_id ON public.subscription_tiers(creator_id);
CREATE INDEX IF NOT EXISTS idx_performance_bookings_performer_id ON public.performance_bookings(performer_id);
CREATE INDEX IF NOT EXISTS idx_digital_product_purchases_product_id ON public.digital_product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_digital_product_purchases_buyer_id ON public.digital_product_purchases(buyer_id);

