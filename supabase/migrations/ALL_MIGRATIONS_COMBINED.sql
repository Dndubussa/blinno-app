-- ============================================
-- BLINNO Platform - All Migrations Combined
-- ============================================
-- This file contains all migrations in order
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- Migration 1: Base Schema
-- ============================================
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  phone TEXT,
  website TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  file_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  service_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(booking_id, reviewer_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies (see original migration for full policies)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Portfolios are viewable by everyone" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "Creators can insert their own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and creators can update their bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolios', 'portfolios', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Portfolio files are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'portfolios');
CREATE POLICY "Creators can upload portfolio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Creators can update their portfolio files" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Creators can delete their portfolio files" ON storage.objects FOR DELETE USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- Migration 2: Add Moderator Role
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'moderator' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'moderator';
    END IF;
END $$;

DROP POLICY IF EXISTS "Moderators and admins can update portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Moderators and admins can delete portfolios" ON public.portfolios;

CREATE POLICY "Moderators and admins can update portfolios"
  ON public.portfolios FOR UPDATE
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators and admins can delete portfolios"
  ON public.portfolios FOR DELETE
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Migration 3: Marketplace Tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own products" ON public.products FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own products" ON public.products FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart items" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart items" ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart items" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view items from their own orders" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Order items can be inserted with user's order" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_creator_id ON public.products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;

-- ============================================
-- Migration 4: Add New Roles (Journalist, Artisan, Employer, Event Organizer)
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'journalist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'journalist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'artisan' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'artisan';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'event_organizer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'event_organizer';
  END IF;
END $$;

-- ============================================
-- Migration 5: Journalist Tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journalists can view all published articles" ON public.news_articles FOR SELECT USING (is_published = true OR auth.uid() = journalist_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Journalists can insert their own articles" ON public.news_articles FOR INSERT WITH CHECK (auth.uid() = journalist_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'journalist'));
CREATE POLICY "Journalists can update their own articles" ON public.news_articles FOR UPDATE USING (auth.uid() = journalist_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Journalists can delete their own articles" ON public.news_articles FOR DELETE USING (auth.uid() = journalist_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Anyone can view categories" ON public.news_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.news_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')));

DROP TRIGGER IF EXISTS update_news_articles_updated_at ON public.news_articles;
CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_news_articles_journalist_id ON public.news_articles(journalist_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON public.news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_published ON public.news_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON public.news_articles(created_at DESC);

-- ============================================
-- Migration 6: Artisan Tables
-- ============================================
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

ALTER TABLE public.artisan_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available artisan services" ON public.artisan_services FOR SELECT USING (true);
CREATE POLICY "Artisans can insert their own services" ON public.artisan_services FOR INSERT WITH CHECK (auth.uid() = artisan_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'artisan'));
CREATE POLICY "Artisans can update their own services" ON public.artisan_services FOR UPDATE USING (auth.uid() = artisan_id);
CREATE POLICY "Artisans can delete their own services" ON public.artisan_services FOR DELETE USING (auth.uid() = artisan_id);
CREATE POLICY "Users can view their own bookings" ON public.artisan_bookings FOR SELECT USING (auth.uid() = artisan_id OR auth.uid() = client_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Clients can create bookings" ON public.artisan_bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Artisans and clients can update bookings" ON public.artisan_bookings FOR UPDATE USING (auth.uid() = artisan_id OR auth.uid() = client_id);

DROP TRIGGER IF EXISTS update_artisan_services_updated_at ON public.artisan_services;
CREATE TRIGGER update_artisan_services_updated_at BEFORE UPDATE ON public.artisan_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_artisan_bookings_updated_at ON public.artisan_bookings;
CREATE TRIGGER update_artisan_bookings_updated_at BEFORE UPDATE ON public.artisan_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_artisan_services_artisan_id ON public.artisan_services(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_services_category ON public.artisan_services(category);
CREATE INDEX IF NOT EXISTS idx_artisan_services_is_available ON public.artisan_services(is_available);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_artisan_id ON public.artisan_bookings(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_client_id ON public.artisan_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_service_id ON public.artisan_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_status ON public.artisan_bookings(status);

-- ============================================
-- Migration 7: Employer Tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  category TEXT NOT NULL,
  skills_required TEXT[] DEFAULT ARRAY[]::TEXT[],
  salary_min DECIMAL(10, 2),
  salary_max DECIMAL(10, 2),
  salary_currency TEXT DEFAULT 'TSh',
  is_remote BOOLEAN DEFAULT false,
  application_deadline TIMESTAMPTZ,
  application_url TEXT,
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(job_posting_id, applicant_id)
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job postings" ON public.job_postings FOR SELECT USING (is_active = true OR auth.uid() = employer_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Employers can insert their own job postings" ON public.job_postings FOR INSERT WITH CHECK (auth.uid() = employer_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'employer'));
CREATE POLICY "Employers can update their own job postings" ON public.job_postings FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete their own job postings" ON public.job_postings FOR DELETE USING (auth.uid() = employer_id);
CREATE POLICY "Applicants and employers can view applications" ON public.job_applications FOR SELECT USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_posting_id AND employer_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can create applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Employers can update applications" ON public.job_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_posting_id AND employer_id = auth.uid()) OR auth.uid() = applicant_id);

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON public.job_postings;
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON public.job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_category ON public.job_postings(category);
CREATE INDEX IF NOT EXISTS idx_job_postings_job_type ON public.job_postings(job_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_is_active ON public.job_postings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON public.job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

-- ============================================
-- Migration 8: Event Organizer Tables
-- ============================================
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

ALTER TABLE public.organized_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events" ON public.organized_events FOR SELECT USING ((is_published = true AND status = 'published') OR auth.uid() = organizer_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Event organizers can insert their own events" ON public.organized_events FOR INSERT WITH CHECK (auth.uid() = organizer_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'event_organizer'));
CREATE POLICY "Event organizers can update their own events" ON public.organized_events FOR UPDATE USING (auth.uid() = organizer_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Event organizers can delete their own events" ON public.organized_events FOR DELETE USING (auth.uid() = organizer_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Organizers and attendees can view registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = attendee_id OR EXISTS (SELECT 1 FROM public.organized_events WHERE id = event_id AND organizer_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can register for events" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = attendee_id);
CREATE POLICY "Organizers and attendees can update registrations" ON public.event_registrations FOR UPDATE USING (auth.uid() = attendee_id OR EXISTS (SELECT 1 FROM public.organized_events WHERE id = event_id AND organizer_id = auth.uid()));

DROP TRIGGER IF EXISTS update_organized_events_updated_at ON public.organized_events;
CREATE TRIGGER update_organized_events_updated_at BEFORE UPDATE ON public.organized_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_organized_events_organizer_id ON public.organized_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organized_events_category ON public.organized_events(category);
CREATE INDEX IF NOT EXISTS idx_organized_events_start_date ON public.organized_events(start_date);
CREATE INDEX IF NOT EXISTS idx_organized_events_is_published ON public.organized_events(is_published);
CREATE INDEX IF NOT EXISTS idx_organized_events_status ON public.organized_events(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_attendee_id ON public.event_registrations(attendee_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);

-- ============================================
-- Migration 9: Creator Monetization Tables
-- ============================================
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

CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_name TEXT NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  benefits TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(creator_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  benefits TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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
  currency TEXT DEFAULT 'TSh',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  requirements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.digital_product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(product_id, buyer_id)
);

ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monetization tables
CREATE POLICY "Anyone can view active digital products" ON public.digital_products FOR SELECT USING (is_active = true OR auth.uid() = creator_id);
CREATE POLICY "Creators can insert their own digital products" ON public.digital_products FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own digital products" ON public.digital_products FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own digital products" ON public.digital_products FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Creators and clients can view their commissions" ON public.commissions FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = client_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Clients can create commissions" ON public.commissions FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Creators and clients can update commissions" ON public.commissions FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = client_id);
CREATE POLICY "Creators can view tips they received" ON public.tips FOR SELECT USING (auth.uid() = creator_id OR (auth.uid() = tipper_id AND is_anonymous = false) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can create tips" ON public.tips FOR INSERT WITH CHECK (auth.uid() = tipper_id);
CREATE POLICY "Creators and subscribers can view subscriptions" ON public.creator_subscriptions FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = subscriber_id);
CREATE POLICY "Users can create subscriptions" ON public.creator_subscriptions FOR INSERT WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "Subscribers can update their subscriptions" ON public.creator_subscriptions FOR UPDATE USING (auth.uid() = subscriber_id);
CREATE POLICY "Anyone can view active subscription tiers" ON public.subscription_tiers FOR SELECT USING (is_active = true OR auth.uid() = creator_id);
CREATE POLICY "Creators can manage their subscription tiers" ON public.subscription_tiers FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Performers and clients can view bookings" ON public.performance_bookings FOR SELECT USING (auth.uid() = performer_id OR auth.uid() = client_id);
CREATE POLICY "Clients can create performance bookings" ON public.performance_bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Performers and clients can update bookings" ON public.performance_bookings FOR UPDATE USING (auth.uid() = performer_id OR auth.uid() = client_id);
CREATE POLICY "Buyers and product creators can view purchases" ON public.digital_product_purchases FOR SELECT USING (auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM public.digital_products WHERE id = product_id AND creator_id = auth.uid()));
CREATE POLICY "Users can purchase digital products" ON public.digital_product_purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Triggers for monetization tables
DROP TRIGGER IF EXISTS update_digital_products_updated_at ON public.digital_products;
CREATE TRIGGER update_digital_products_updated_at BEFORE UPDATE ON public.digital_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_creator_subscriptions_updated_at ON public.creator_subscriptions;
CREATE TRIGGER update_creator_subscriptions_updated_at BEFORE UPDATE ON public.creator_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscription_tiers_updated_at ON public.subscription_tiers;
CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON public.subscription_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_performance_bookings_updated_at ON public.performance_bookings;
CREATE TRIGGER update_performance_bookings_updated_at BEFORE UPDATE ON public.performance_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for monetization tables
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

-- ============================================
-- Migration Complete!
-- ============================================
-- All migrations have been applied successfully.
-- Your database is now ready with all features.
-- ============================================

