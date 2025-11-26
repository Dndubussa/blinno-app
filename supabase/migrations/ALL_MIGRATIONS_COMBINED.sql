-- ============================================
-- BLINNO Platform - All Migrations Combined
-- ============================================
-- This file contains all migrations in order
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- Migration 1: Base Schema
-- ============================================
-- Create app_role enum for user roles (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator');
  END IF;
END $$;

-- Add additional enum values safely (only if they don't exist)
DO $$ 
BEGIN
  -- Add journalist role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'journalist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'journalist';
  END IF;
  
  -- Add artisan role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'artisan' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'artisan';
  END IF;
  
  -- Add employer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employer';
  END IF;
  
  -- Add event_organizer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'event_organizer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'event_organizer';
  END IF;
  
  -- Add moderator role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
  
  -- Add musician role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'musician' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'musician';
  END IF;
END $$;

-- Create profiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- Create user_roles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_roles (
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
-- Add moderator role to app_role enum (already handled above, but keeping for reference)
-- This is now handled in the initial enum creation block above

-- ============================================
-- Migration 3: Add Freelancer Tables
-- ============================================
-- Create freelancer tables
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  billing_type TEXT CHECK (billing_type IN ('hourly', 'fixed', 'milestone')),
  budget DECIMAL(10, 2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  proposed_rate DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2),
  rate DECIMAL(10, 2),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  hours DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.freelancer_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('hourly', 'fixed', 'project')),
  hourly_rate DECIMAL(10, 2),
  fixed_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for freelancer tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_services ENABLE ROW LEVEL SECURITY;

-- Freelancer RLS Policies
CREATE POLICY "Freelancers can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers and clients can view proposals" ON public.proposals FOR SELECT USING (auth.uid() = freelancer_id OR auth.uid() = client_id);
CREATE POLICY "Freelancers can create proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers and clients can update proposals" ON public.proposals FOR UPDATE USING (auth.uid() = freelancer_id OR auth.uid() = client_id);
CREATE POLICY "Freelancers can view their clients" ON public.clients FOR SELECT USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can create clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update their clients" ON public.clients FOR UPDATE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can delete their clients" ON public.clients FOR DELETE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can view their invoices" ON public.invoices FOR SELECT USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can create invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update their invoices" ON public.invoices FOR UPDATE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can delete their invoices" ON public.invoices FOR DELETE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can view their invoice items" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND freelancer_id = auth.uid()));
CREATE POLICY "Freelancers can create invoice items" ON public.invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND freelancer_id = auth.uid()));
CREATE POLICY "Freelancers can update invoice items" ON public.invoice_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND freelancer_id = auth.uid()));
CREATE POLICY "Freelancers can delete invoice items" ON public.invoice_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND freelancer_id = auth.uid()));
CREATE POLICY "Freelancers can view their time entries" ON public.time_entries FOR SELECT USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can create time entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update their time entries" ON public.time_entries FOR UPDATE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can delete their time entries" ON public.time_entries FOR DELETE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can view their services" ON public.freelancer_services FOR SELECT USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can create services" ON public.freelancer_services FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update their services" ON public.freelancer_services FOR UPDATE USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can delete their services" ON public.freelancer_services FOR DELETE USING (auth.uid() = freelancer_id);

-- Add triggers for freelancer tables
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_freelancer_services_updated_at ON public.freelancer_services;
CREATE TRIGGER update_freelancer_services_updated_at BEFORE UPDATE ON public.freelancer_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for freelancer tables
CREATE INDEX IF NOT EXISTS idx_projects_freelancer_id ON public.projects(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer_id ON public.proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_freelancer_id ON public.clients(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_freelancer_id ON public.invoices(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_freelancer_id ON public.time_entries(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_services_freelancer_id ON public.freelancer_services(freelancer_id);

-- ============================================
-- Migration 4: Add Marketplace Tables
-- ============================================
-- Create marketplace tables
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for marketplace tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Marketplace RLS Policies
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true OR auth.uid() = creator_id);
CREATE POLICY "Creators can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own products" ON public.products FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own products" ON public.products FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert cart items" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their cart items" ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their cart items" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add triggers for marketplace tables
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for marketplace tables
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON public.products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- ============================================
-- Migration 5: Add Lodging Tables
-- ============================================
-- Create lodging tables
CREATE TABLE public.lodging_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  property_type TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  amenities TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.lodging_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.lodging_properties(id) ON DELETE CASCADE NOT NULL,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  amenities TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.lodging_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.lodging_properties(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.lodging_rooms(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for lodging tables
ALTER TABLE public.lodging_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodging_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodging_bookings ENABLE ROW LEVEL SECURITY;

-- Lodging RLS Policies
CREATE POLICY "Anyone can view lodging properties" ON public.lodging_properties FOR SELECT USING (true);
CREATE POLICY "Property owners can insert properties" ON public.lodging_properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Property owners can update their properties" ON public.lodging_properties FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Property owners can delete their properties" ON public.lodging_properties FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can view lodging rooms" ON public.lodging_rooms FOR SELECT USING (true);
CREATE POLICY "Property owners can insert rooms" ON public.lodging_rooms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.lodging_properties WHERE id = property_id AND owner_id = auth.uid()));
CREATE POLICY "Property owners can update their rooms" ON public.lodging_rooms FOR UPDATE USING (EXISTS (SELECT 1 FROM public.lodging_properties WHERE id = property_id AND owner_id = auth.uid()));
CREATE POLICY "Property owners can delete their rooms" ON public.lodging_rooms FOR DELETE USING (EXISTS (SELECT 1 FROM public.lodging_properties WHERE id = property_id AND owner_id = auth.uid()));
CREATE POLICY "Guests can view their bookings" ON public.lodging_bookings FOR SELECT USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM public.lodging_properties WHERE id = property_id AND owner_id = auth.uid()));
CREATE POLICY "Guests can create bookings" ON public.lodging_bookings FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Guests and property owners can update bookings" ON public.lodging_bookings FOR UPDATE USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM public.lodging_properties WHERE id = property_id AND owner_id = auth.uid()));

-- Add triggers for lodging tables
DROP TRIGGER IF EXISTS update_lodging_properties_updated_at ON public.lodging_properties;
CREATE TRIGGER update_lodging_properties_updated_at BEFORE UPDATE ON public.lodging_properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_lodging_rooms_updated_at ON public.lodging_rooms;
CREATE TRIGGER update_lodging_rooms_updated_at BEFORE UPDATE ON public.lodging_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_lodging_bookings_updated_at ON public.lodging_bookings;
CREATE TRIGGER update_lodging_bookings_updated_at BEFORE UPDATE ON public.lodging_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for lodging tables
CREATE INDEX IF NOT EXISTS idx_lodging_properties_owner_id ON public.lodging_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_lodging_rooms_property_id ON public.lodging_rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_property_id ON public.lodging_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_guest_id ON public.lodging_bookings(guest_id);

-- ============================================
-- Migration 6: Add Restaurant Tables
-- ============================================
-- Create restaurant tables
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cuisine_type TEXT,
  location TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  opening_hours JSONB,
  accepts_reservations BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10, 2) NOT NULL,
  dietary_info TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reservation_date TIMESTAMPTZ NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for restaurant tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Restaurant RLS Policies
CREATE POLICY "Anyone can view restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can insert restaurants" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Restaurant owners can update their restaurants" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Restaurant owners can delete their restaurants" ON public.restaurants FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));
CREATE POLICY "Restaurant owners can update their menu items" ON public.menu_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));
CREATE POLICY "Restaurant owners can delete their menu items" ON public.menu_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));
CREATE POLICY "Guests can view their reservations" ON public.restaurant_reservations FOR SELECT USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));
CREATE POLICY "Guests can create reservations" ON public.restaurant_reservations FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Guests and restaurant owners can update reservations" ON public.restaurant_reservations FOR UPDATE USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- Add triggers for restaurant tables
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_restaurant_reservations_updated_at ON public.restaurant_reservations;
CREATE TRIGGER update_restaurant_reservations_updated_at BEFORE UPDATE ON public.restaurant_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for restaurant tables
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_restaurant_id ON public.restaurant_reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_guest_id ON public.restaurant_reservations(guest_id);

-- ============================================
-- Migration 7: Add Educator Tables
-- ============================================
-- Create educator tables
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT,
  price DECIMAL(10, 2),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  lesson_type TEXT,
  content TEXT,
  video_url TEXT,
  is_preview BOOLEAN DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  UNIQUE(course_id, student_id)
);

-- Enable RLS for educator tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Educator RLS Policies
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (is_published = true OR auth.uid() = educator_id);
CREATE POLICY "Educators can insert courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = educator_id);
CREATE POLICY "Educators can update their courses" ON public.courses FOR UPDATE USING (auth.uid() = educator_id);
CREATE POLICY "Educators can delete their courses" ON public.courses FOR DELETE USING (auth.uid() = educator_id);
CREATE POLICY "Educators can view lessons for their courses" ON public.course_lessons FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND educator_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = course_lessons.course_id AND student_id = auth.uid()));
CREATE POLICY "Educators can insert lessons" ON public.course_lessons FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND educator_id = auth.uid()));
CREATE POLICY "Educators can update lessons" ON public.course_lessons FOR UPDATE USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND educator_id = auth.uid()));
CREATE POLICY "Educators can delete lessons" ON public.course_lessons FOR DELETE USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND educator_id = auth.uid()));
CREATE POLICY "Students and educators can view enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND educator_id = auth.uid()));
CREATE POLICY "Students can enroll in courses" ON public.course_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update their enrollments" ON public.course_enrollments FOR UPDATE USING (auth.uid() = student_id);

-- Add triggers for educator tables
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON public.course_lessons;
CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for educator tables
CREATE INDEX IF NOT EXISTS idx_courses_educator_id ON public.courses(educator_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON public.course_enrollments(student_id);

-- ============================================
-- Migration 8: Add Journalist Tables
-- ============================================
-- Create journalist tables
CREATE TABLE public.news_articles (
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

CREATE TABLE public.news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for journalist tables
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

-- Journalist RLS Policies
CREATE POLICY "Anyone can view published articles" ON public.news_articles FOR SELECT USING (is_published = true OR auth.uid() = journalist_id);
CREATE POLICY "Journalists can insert articles" ON public.news_articles FOR INSERT WITH CHECK (auth.uid() = journalist_id);
CREATE POLICY "Journalists can update their articles" ON public.news_articles FOR UPDATE USING (auth.uid() = journalist_id);
CREATE POLICY "Journalists can delete their articles" ON public.news_articles FOR DELETE USING (auth.uid() = journalist_id);
CREATE POLICY "Anyone can view news categories" ON public.news_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.news_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update categories" ON public.news_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete categories" ON public.news_categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add triggers for journalist tables
DROP TRIGGER IF EXISTS update_news_articles_updated_at ON public.news_articles;
CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for journalist tables
CREATE INDEX IF NOT EXISTS idx_news_articles_journalist_id ON public.news_articles(journalist_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON public.news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_published ON public.news_articles(is_published);

-- ============================================
-- Migration 9: Add Artisan Tables
-- ============================================
-- Create artisan tables
CREATE TABLE public.artisan_services (
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

CREATE TABLE public.artisan_bookings (
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

-- Enable RLS for artisan tables
ALTER TABLE public.artisan_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_bookings ENABLE ROW LEVEL SECURITY;

-- Artisan RLS Policies
CREATE POLICY "Anyone can view artisan services" ON public.artisan_services FOR SELECT USING (true);
CREATE POLICY "Artisans can insert services" ON public.artisan_services FOR INSERT WITH CHECK (auth.uid() = artisan_id);
CREATE POLICY "Artisans can update their services" ON public.artisan_services FOR UPDATE USING (auth.uid() = artisan_id);
CREATE POLICY "Artisans can delete their services" ON public.artisan_services FOR DELETE USING (auth.uid() = artisan_id);
CREATE POLICY "Artisans and clients can view bookings" ON public.artisan_bookings FOR SELECT USING (auth.uid() = artisan_id OR auth.uid() = client_id);
CREATE POLICY "Clients can create bookings" ON public.artisan_bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Artisans and clients can update bookings" ON public.artisan_bookings FOR UPDATE USING (auth.uid() = artisan_id OR auth.uid() = client_id);

-- Add triggers for artisan tables
DROP TRIGGER IF EXISTS update_artisan_services_updated_at ON public.artisan_services;
CREATE TRIGGER update_artisan_services_updated_at BEFORE UPDATE ON public.artisan_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_artisan_bookings_updated_at ON public.artisan_bookings;
CREATE TRIGGER update_artisan_bookings_updated_at BEFORE UPDATE ON public.artisan_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for artisan tables
CREATE INDEX IF NOT EXISTS idx_artisan_services_artisan_id ON public.artisan_services(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_artisan_id ON public.artisan_bookings(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_bookings_client_id ON public.artisan_bookings(client_id);

-- ============================================
-- Migration 10: Add Employer Tables
-- ============================================
-- Create employer tables
CREATE TABLE public.job_postings (
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

CREATE TABLE public.job_applications (
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

-- Enable RLS for employer tables
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Employer RLS Policies
CREATE POLICY "Anyone can view active job postings" ON public.job_postings FOR SELECT USING (is_active = true OR auth.uid() = employer_id);
CREATE POLICY "Employers can insert job postings" ON public.job_postings FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update their job postings" ON public.job_postings FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete their job postings" ON public.job_postings FOR DELETE USING (auth.uid() = employer_id);
CREATE POLICY "Employers and applicants can view applications" ON public.job_applications FOR SELECT USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_posting_id AND employer_id = auth.uid()));
CREATE POLICY "Applicants can create applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Employers and applicants can update applications" ON public.job_applications FOR UPDATE USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_posting_id AND employer_id = auth.uid()));

-- Add triggers for employer tables
DROP TRIGGER IF EXISTS update_job_postings_updated_at ON public.job_postings;
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for employer tables
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON public.job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_category ON public.job_postings(category);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON public.job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);

-- ============================================
-- Migration 11: Add Event Organizer Tables
-- ============================================
-- Create event organizer tables
CREATE TABLE public.organized_events (
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

CREATE TABLE public.event_registrations (
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

-- Enable RLS for event organizer tables
ALTER TABLE public.organized_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Event Organizer RLS Policies
CREATE POLICY "Anyone can view published events" ON public.organized_events FOR SELECT USING (is_published = true OR auth.uid() = organizer_id);
CREATE POLICY "Event organizers can insert events" ON public.organized_events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Event organizers can update their events" ON public.organized_events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Event organizers can delete their events" ON public.organized_events FOR DELETE USING (auth.uid() = organizer_id);
CREATE POLICY "Event organizers and attendees can view registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = attendee_id OR EXISTS (SELECT 1 FROM public.organized_events WHERE id = event_id AND organizer_id = auth.uid()));
CREATE POLICY "Attendees can create registrations" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = attendee_id);
CREATE POLICY "Event organizers and attendees can update registrations" ON public.event_registrations FOR UPDATE USING (auth.uid() = attendee_id OR EXISTS (SELECT 1 FROM public.organized_events WHERE id = event_id AND organizer_id = auth.uid()));

-- Add triggers for event organizer tables
DROP TRIGGER IF EXISTS update_organized_events_updated_at ON public.organized_events;
CREATE TRIGGER update_organized_events_updated_at BEFORE UPDATE ON public.organized_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for event organizer tables
CREATE INDEX IF NOT EXISTS idx_organized_events_organizer_id ON public.organized_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organized_events_category ON public.organized_events(category);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_attendee_id ON public.event_registrations(attendee_id);

-- ============================================
-- Migration 12: Add Creator Monetization Tables
-- ============================================
-- Create creator monetization tables
CREATE TABLE public.digital_products (
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

CREATE TABLE public.commissions (
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

CREATE TABLE public.tips (
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

CREATE TABLE public.creator_subscriptions (
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

CREATE TABLE public.subscription_tiers (
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

CREATE TABLE public.performance_bookings (
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

CREATE TABLE public.digital_product_purchases (
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

-- Enable RLS for monetization tables
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
-- Migration 13: Add Music Tables
-- ============================================
-- Create music tables
CREATE TABLE public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL,
  duration INTERVAL,
  image_url TEXT,
  audio_url TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'TSh',
  plays_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.music_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.music_tracks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(track_id, user_id)
);

CREATE TABLE public.music_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.music_tracks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for music tables
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_plays ENABLE ROW LEVEL SECURITY;

-- Music RLS Policies
CREATE POLICY "Anyone can view published tracks" ON public.music_tracks FOR SELECT USING (is_published = true OR auth.uid() = musician_id);
CREATE POLICY "Musicians can insert tracks" ON public.music_tracks FOR INSERT WITH CHECK (auth.uid() = musician_id);
CREATE POLICY "Musicians can update their tracks" ON public.music_tracks FOR UPDATE USING (auth.uid() = musician_id);
CREATE POLICY "Musicians can delete their tracks" ON public.music_tracks FOR DELETE USING (auth.uid() = musician_id);
CREATE POLICY "Users can like tracks" ON public.music_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their likes" ON public.music_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their likes" ON public.music_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can record plays" ON public.music_plays FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add triggers for music tables
DROP TRIGGER IF EXISTS update_music_tracks_updated_at ON public.music_tracks;
CREATE TRIGGER update_music_tracks_updated_at BEFORE UPDATE ON public.music_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for music tables
CREATE INDEX IF NOT EXISTS idx_music_tracks_musician_id ON public.music_tracks(musician_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_genre ON public.music_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_music_tracks_is_published ON public.music_tracks(is_published);
CREATE INDEX IF NOT EXISTS idx_music_likes_track_id ON public.music_likes(track_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_user_id ON public.music_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_music_plays_track_id ON public.music_plays(track_id);

-- ============================================
-- Migration Complete!
-- ============================================
-- All migrations have been applied successfully.
-- Your database is now ready with all features.
-- ============================================