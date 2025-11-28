-- Optimize remaining RLS policies: Replace auth.uid() with (SELECT auth.uid()) for better performance
-- This prevents re-evaluation of auth.uid() for each row
-- Applied in batches to avoid timeout

-- Batch 1: Bookings, Reviews, Projects, Proposals, Clients
-- ============================================
-- BOOKINGS (3 policies)
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
-- REVIEWS (2 policies)
-- ============================================
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = reviewer_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE
  USING ((SELECT auth.uid()) = reviewer_id);

-- ============================================
-- PROJECTS (4 policies)
-- ============================================
DROP POLICY IF EXISTS "Freelancers can view their own projects" ON public.projects;
CREATE POLICY "Freelancers can view their own projects" ON public.projects
  FOR SELECT
  USING ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can create projects" ON public.projects;
CREATE POLICY "Freelancers can create projects" ON public.projects
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can update their own projects" ON public.projects;
CREATE POLICY "Freelancers can update their own projects" ON public.projects
  FOR UPDATE
  USING ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can delete their own projects" ON public.projects;
CREATE POLICY "Freelancers can delete their own projects" ON public.projects
  FOR DELETE
  USING ((SELECT auth.uid()) = freelancer_id);

-- ============================================
-- PROPOSALS (3 policies)
-- ============================================
DROP POLICY IF EXISTS "Freelancers and clients can view proposals" ON public.proposals;
CREATE POLICY "Freelancers and clients can view proposals" ON public.proposals
  FOR SELECT
  USING (((SELECT auth.uid()) = freelancer_id) OR ((SELECT auth.uid()) = client_id));

DROP POLICY IF EXISTS "Freelancers can create proposals" ON public.proposals;
CREATE POLICY "Freelancers can create proposals" ON public.proposals
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Freelancers and clients can update proposals" ON public.proposals;
CREATE POLICY "Freelancers and clients can update proposals" ON public.proposals
  FOR UPDATE
  USING (((SELECT auth.uid()) = freelancer_id) OR ((SELECT auth.uid()) = client_id));

-- ============================================
-- CLIENTS (4 policies)
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
