-- Add moderator role to app_role enum
-- Use DO block to safely add enum value if it doesn't exist
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

-- Update RLS policies to allow moderators to moderate content
-- Moderators can update portfolios (feature/unfeature, delete)
DROP POLICY IF EXISTS "Creators can update their own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Creators can delete their own portfolios" ON public.portfolios;

-- Creators can update their own portfolios
CREATE POLICY "Creators can update their own portfolios"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete their own portfolios
CREATE POLICY "Creators can delete their own portfolios"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = creator_id);

-- Moderators and admins can update any portfolio (for moderation)
CREATE POLICY "Moderators and admins can update portfolios"
  ON public.portfolios FOR UPDATE
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- Moderators and admins can delete any portfolio (for moderation)
CREATE POLICY "Moderators and admins can delete portfolios"
  ON public.portfolios FOR DELETE
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

