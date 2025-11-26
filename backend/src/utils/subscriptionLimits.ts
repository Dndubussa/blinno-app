import { pool } from '../config/database.js';

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
    const subscriptionResult = await pool.query(
      `SELECT tier, pricing_model, percentage_tier FROM platform_subscriptions WHERE user_id = $1`,
      [userId]
    );

    let tierInfo;
    
    if (subscriptionResult.rows.length === 0) {
      // User has no subscription, use free tier limits
      tierInfo = SUBSCRIPTION_TIERS.free;
    } else {
      const subscription = subscriptionResult.rows[0];
      
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
    const productCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE creator_id = $1',
      [userId]
    );

    const currentCount = parseInt(productCountResult.rows[0].count);

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
    const subscriptionResult = await pool.query(
      `SELECT tier, pricing_model, percentage_tier FROM platform_subscriptions WHERE user_id = $1`,
      [userId]
    );

    let tierInfo;
    
    if (subscriptionResult.rows.length === 0) {
      // User has no subscription, use free tier limits
      tierInfo = SUBSCRIPTION_TIERS.free;
    } else {
      const subscription = subscriptionResult.rows[0];
      
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
    const portfolioCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM portfolios WHERE creator_id = $1',
      [userId]
    );

    const currentCount = parseInt(portfolioCountResult.rows[0].count);

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