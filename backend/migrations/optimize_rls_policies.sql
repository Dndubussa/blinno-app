-- RLS Policy Performance Optimization Migration
-- This migration optimizes RLS policies by replacing auth.uid() with (SELECT auth.uid())
-- to prevent re-evaluation for each row, improving query performance at scale.

-- Note: This is a large migration. If it times out, split into smaller batches.

-- ============================================
-- ARTISAN BOOKINGS
-- ============================================
DROP POLICY IF EXISTS "Artisans and clients can view bookings" ON public.artisan_bookings;
CREATE POLICY "Artisans and clients can view bookings" ON public.artisan_bookings
  FOR SELECT
  USING (((SELECT auth.uid()) = artisan_id) OR ((SELECT auth.uid()) = client_id));

DROP POLICY IF EXISTS "Clients can create bookings" ON public.artisan_bookings;
CREATE POLICY "Clients can create bookings" ON public.artisan_bookings
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Artisans and clients can update bookings" ON public.artisan_bookings;
CREATE POLICY "Artisans and clients can update bookings" ON public.artisan_bookings
  FOR UPDATE
  USING (((SELECT auth.uid()) = artisan_id) OR ((SELECT auth.uid()) = client_id));

-- ============================================
-- ARTISAN SERVICES
-- ============================================
DROP POLICY IF EXISTS "Artisans can insert services" ON public.artisan_services;
CREATE POLICY "Artisans can insert services" ON public.artisan_services
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = artisan_id);

DROP POLICY IF EXISTS "Artisans can update their services" ON public.artisan_services;
CREATE POLICY "Artisans can update their services" ON public.artisan_services
  FOR UPDATE
  USING ((SELECT auth.uid()) = artisan_id);

DROP POLICY IF EXISTS "Artisans can delete their services" ON public.artisan_services;
CREATE POLICY "Artisans can delete their services" ON public.artisan_services
  FOR DELETE
  USING ((SELECT auth.uid()) = artisan_id);

-- ============================================
-- BOOKINGS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT
  USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = creator_id));

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users and creators can update their bookings" ON public.bookings;
CREATE POLICY "Users and creators can update their bookings" ON public.bookings
  FOR UPDATE
  USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = creator_id));

-- ============================================
-- CART ITEMS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert cart items" ON public.cart_items;
CREATE POLICY "Users can insert cart items" ON public.cart_items
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their cart items" ON public.cart_items;
CREATE POLICY "Users can update their cart items" ON public.cart_items
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their cart items" ON public.cart_items;
CREATE POLICY "Users can delete their cart items" ON public.cart_items
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- CLIENTS
-- ============================================
DROP POLICY IF EXISTS "Freelancers can view their clients" ON public.clients;
CREATE POLICY "Freelancers can view their clients" ON public.clients
  FOR SELECT
  USING ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can create clients" ON public.clients;
CREATE POLICY "Freelancers can create clients" ON public.clients
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can update their clients" ON public.clients;
CREATE POLICY "Freelancers can update their clients" ON public.clients
  FOR UPDATE
  USING ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can delete their clients" ON public.clients;
CREATE POLICY "Freelancers can delete their clients" ON public.clients
  FOR DELETE
  USING ((SELECT auth.uid()) = freelancer_id);

-- ============================================
-- COMMISSIONS
-- ============================================
DROP POLICY IF EXISTS "Creators and clients can view their commissions" ON public.commissions;
CREATE POLICY "Creators and clients can view their commissions" ON public.commissions
  FOR SELECT
  USING (((SELECT auth.uid()) = creator_id) OR ((SELECT auth.uid()) = client_id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role)));

DROP POLICY IF EXISTS "Clients can create commissions" ON public.commissions;
CREATE POLICY "Clients can create commissions" ON public.commissions
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Creators and clients can update commissions" ON public.commissions;
CREATE POLICY "Creators and clients can update commissions" ON public.commissions
  FOR UPDATE
  USING (((SELECT auth.uid()) = creator_id) OR ((SELECT auth.uid()) = client_id));

-- Continue with remaining tables...
-- This file can be split into multiple migrations if needed

