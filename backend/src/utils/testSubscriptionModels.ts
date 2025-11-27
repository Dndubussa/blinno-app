import { supabase } from '../config/supabase.js';
import { checkProductLimit, checkPortfolioLimit } from './subscriptionLimits.js';

async function testSubscriptionModels() {
  console.log('Testing subscription models...');
  
  // Test with a user ID (you would replace this with an actual user ID from your database)
  const testUserId = 'test-user-id';
  
  try {
    // Test subscription-based model
    console.log('Testing subscription-based model...');
    
    // Insert a test subscription record for subscription-based model
    const { error: subscriptionError } = await supabase
      .from('platform_subscriptions')
      .upsert({
        user_id: testUserId,
        tier: 'creator',
        pricing_model: 'subscription',
        monthly_price: 15,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      throw subscriptionError;
    }
    
    // Test product limit for subscription-based model
    const productLimitSub = await checkProductLimit(testUserId);
    console.log('Subscription model product limit:', productLimitSub);
    
    // Test portfolio limit for subscription-based model
    const portfolioLimitSub = await checkPortfolioLimit(testUserId);
    console.log('Subscription model portfolio limit:', portfolioLimitSub);
    
    // Test percentage-based model
    console.log('Testing percentage-based model...');
    
    // Update the test subscription record for percentage-based model
    const { error: percentageError } = await supabase
      .from('platform_subscriptions')
      .upsert({
        user_id: testUserId,
        tier: 'percentage',
        pricing_model: 'percentage',
        percentage_tier: 'premium',
        monthly_price: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      });

    if (percentageError) {
      throw percentageError;
    }
    
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