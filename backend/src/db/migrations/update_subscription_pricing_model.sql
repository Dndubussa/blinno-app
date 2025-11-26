-- Update platform_subscriptions table to support dual pricing model
-- Add columns for pricing model and percentage-based tier

ALTER TABLE platform_subscriptions 
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'subscription' 
CHECK (pricing_model IN ('subscription', 'percentage'));

ALTER TABLE platform_subscriptions 
ADD COLUMN IF NOT EXISTS percentage_tier TEXT 
CHECK (percentage_tier IN ('basic', 'premium', 'pro'));

-- Update existing records to ensure pricing_model is set
UPDATE platform_subscriptions 
SET pricing_model = 'subscription' 
WHERE pricing_model IS NULL;

-- Update tier check constraint to include 'percentage' value
ALTER TABLE platform_subscriptions 
DROP CONSTRAINT IF EXISTS platform_subscriptions_tier_check;

ALTER TABLE platform_subscriptions 
ADD CONSTRAINT platform_subscriptions_tier_check 
CHECK (tier IN ('free', 'creator', 'professional', 'enterprise', 'percentage'));