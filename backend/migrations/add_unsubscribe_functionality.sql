-- Add unsubscribe functionality for marketing emails

-- Create unsubscribe table
CREATE TABLE IF NOT EXISTS public.unsubscribed_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_unsubscribed_users_user_id ON public.unsubscribed_users(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_users_email ON public.unsubscribed_users(email);

-- Enable RLS
ALTER TABLE public.unsubscribed_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own unsubscribe status
CREATE POLICY "Users can view own unsubscribe status"
    ON public.unsubscribed_users
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own unsubscribe record
CREATE POLICY "Users can unsubscribe themselves"
    ON public.unsubscribed_users
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all unsubscribes"
    ON public.unsubscribed_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Add unsubscribe preference to profiles (optional, for future use)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT true;

-- Create function to check if user is unsubscribed
CREATE OR REPLACE FUNCTION public.is_user_unsubscribed(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.unsubscribed_users
        WHERE user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON public.unsubscribed_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_unsubscribed(UUID) TO authenticated;

COMMENT ON TABLE public.unsubscribed_users IS 'Tracks users who have unsubscribed from marketing emails';
COMMENT ON COLUMN public.profiles.marketing_emails_enabled IS 'User preference for receiving marketing emails';

