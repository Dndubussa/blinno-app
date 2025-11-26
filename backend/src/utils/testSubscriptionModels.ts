import { pool } from '../config/database.js';
import { checkProductLimit, checkPortfolioLimit } from './subscriptionLimits.js';

async function testSubscriptionModels() {
  console.log('Testing subscription models...');
  
  // Test with a user ID (you would replace this with an actual user ID from your database)
  const testUserId = 'test-user-id';
  
  try {
    // Test subscription-based model
    console.log('Testing subscription-based model...');
    
    // Insert a test subscription record for subscription-based model
    await pool.query(
      `INSERT INTO platform_subscriptions (
        user_id, tier, pricing_model, monthly_price, 
        current_period_start, current_period_end, status, payment_status
      ) VALUES ($1, $2, $3, $4, now(), now() + interval '1 month', 'active', 'paid')
      ON CONFLICT (user_id) DO UPDATE
      SET tier = $2, pricing_model = $3, monthly_price = $4,
          current_period_start = now(), current_period_end = now() + interval '1 month',
          status = 'active', payment_status = 'paid', updated_at = now()`,
      [testUserId, 'creator', 'subscription', 15000]
    );
    
    // Test product limit for subscription-based model
    const productLimitSub = await checkProductLimit(testUserId);
    console.log('Subscription model product limit:', productLimitSub);
    
    // Test portfolio limit for subscription-based model
    const portfolioLimitSub = await checkPortfolioLimit(testUserId);
    console.log('Subscription model portfolio limit:', portfolioLimitSub);
    
    // Test percentage-based model
    console.log('Testing percentage-based model...');
    
    // Update the test subscription record for percentage-based model
    await pool.query(
      `INSERT INTO platform_subscriptions (
        user_id, tier, pricing_model, percentage_tier, monthly_price, 
        current_period_start, current_period_end, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, now(), now() + interval '1 month', 'active', 'paid')
      ON CONFLICT (user_id) DO UPDATE
      SET tier = $2, pricing_model = $3, percentage_tier = $4, monthly_price = $5,
          current_period_start = now(), current_period_end = now() + interval '1 month',
          status = 'active', payment_status = 'paid', updated_at = now()`,
      [testUserId, 'percentage', 'percentage', 'premium', 0]
    );
    
    // Test product limit for percentage-based model
    const productLimitPct = await checkProductLimit(testUserId);
    console.log('Percentage model product limit:', productLimitPct);
    
    // Test portfolio limit for percentage-based model
    const portfolioLimitPct = await checkPortfolioLimit(testUserId);
    console.log('Percentage model portfolio limit:', portfolioLimitPct);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSubscriptionModels();