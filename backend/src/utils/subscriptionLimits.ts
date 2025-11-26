import { supabase } from '../config/supabase.js';

// Define subscription tiers with their limits
const SUBSCRIPTION_TIERS = {
  free: { limits: { products: 5, portfolios: 3 } },
  creator: { limits: { products: -1, portfolios: -1 } },
  professional: { limits: { products: -1, portfolios: -1 } },
  enterprise: { limits: { products: -1, portfolios: -1 } },
};

const PERCENTAGE_TIERS = {
  basic: { limits: { products: 5, portfolios: 3 } },
  premium: { limits: { products: -1, portfolios: -1 } },
  pro: { limits: { products: -1, portfolios: -1 } },
};

/**
 * Check if a user can create a product based on their subscription limits
 * @param userId - The user ID to check
 * @returns Object with canCreate flag, limit (if applicable), and current count
 */
export async function checkProductLimit(userId: string): Promise<{ canCreate: boolean; limit?: number; currentCount: number }> {
  try {
    // Get user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('platform_subscriptions')
      .select('tier, pricing_model, percentage_tier')
      .eq('user_id', userId)
      .single();

    let tierInfo;
    
    if (subscriptionError || !subscriptionData) {
      // User has no subscription, use free tier limits
      tierInfo = SUBSCRIPTION_TIERS.free;
    } else {
      const subscription = subscriptionData;
      
      if (subscription.pricing_model === 'percentage') {
        tierInfo = PERCENTAGE_TIERS[subscription.percentage_tier as keyof typeof PERCENTAGE_TIERS] || 
                  SUBSCRIPTION_TIERS.free;
      } else {
        tierInfo = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS] || 
                  SUBSCRIPTION_TIERS.free;
      }
    }

    // If unlimited products (-1), user can always create
    if (tierInfo.limits.products === -1) {
      return { canCreate: true, currentCount: 0 };
    }

    // Count user's current products
    const { count: productCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('creator_id', userId);

    if (countError) {
      throw countError;
    }

    const currentCount = productCount || 0;

    return {
      canCreate: currentCount < tierInfo.limits.products,
      limit: tierInfo.limits.products,
      currentCount
    };
  } catch (error) {
    console.error('Error checking product limit:', error);
    // In case of error, allow creation to avoid blocking users
    return { canCreate: true, currentCount: 0 };
  }
}

/**
 * Check if a user can create a portfolio based on their subscription limits
 * @param userId - The user ID to check
 * @returns Object with canCreate flag, limit (if applicable), and current count
 */
export async function checkPortfolioLimit(userId: string): Promise<{ canCreate: boolean; limit?: number; currentCount: number }> {
  try {
    // Get user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('platform_subscriptions')
      .select('tier, pricing_model, percentage_tier')
      .eq('user_id', userId)
      .single();

    let tierInfo;
    
    if (subscriptionError || !subscriptionData) {
      // User has no subscription, use free tier limits
      tierInfo = SUBSCRIPTION_TIERS.free;
    } else {
      const subscription = subscriptionData;
      
      if (subscription.pricing_model === 'percentage') {
        tierInfo = PERCENTAGE_TIERS[subscription.percentage_tier as keyof typeof PERCENTAGE_TIERS] || 
                  SUBSCRIPTION_TIERS.free;
      } else {
        tierInfo = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS] || 
                  SUBSCRIPTION_TIERS.free;
      }
    }

    // If unlimited portfolios (-1), user can always create
    if (tierInfo.limits.portfolios === -1) {
      return { canCreate: true, currentCount: 0 };
    }

    // Count user's current portfolios
    const { count: portfolioCount, error: countError } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact' })
      .eq('creator_id', userId);

    if (countError) {
      throw countError;
    }

    const currentCount = portfolioCount || 0;

    return {
      canCreate: currentCount < tierInfo.limits.portfolios,
      limit: tierInfo.limits.portfolios,
      currentCount
    };
  } catch (error) {
    console.error('Error checking portfolio limit:', error);
    // In case of error, allow creation to avoid blocking users
    return { canCreate: true, currentCount: 0 };
  }
}