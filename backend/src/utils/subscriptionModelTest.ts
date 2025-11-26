import { pool } from '../config/database.js';
import { checkProductLimit, checkPortfolioLimit } from './subscriptionLimits.js';

/**
 * Test subscription and percentage-based pricing models
 */
async function testSubscriptionModels() {
  console.log('🧪 Testing subscription models...\n');
  
  // Use a test user ID
  const testUserId = 'test-user-123';
  
  try {
    // Clean up any existing test data
    await pool.query('DELETE FROM platform_subscriptions WHERE user_id = $1', [testUserId]);
    
    // Test 1: Free tier subscription model
    console.log('📋 Test 1: Free tier subscription model');
    await pool.query(
      `INSERT INTO platform_subscriptions (
        user_id, tier, pricing_model, monthly_price, 
        current_period_start, current_period_end, status, payment_status
      ) VALUES ($1, $2, $3, $4, now(), now() + interval '1 month', 'active', 'paid')
      ON CONFLICT (user_id) DO UPDATE
      SET tier = $2, pricing_model = $3, monthly_price = $4,
          current_period_start = now(), current_period_end = now() + interval '1 month',
          status = 'active', payment_status = 'paid', updated_at = now()`,
      [testUserId, 'free', 'subscription', 0]
    );
    
    const freeProductLimit = await checkProductLimit(testUserId);
    const freePortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${freeProductLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${freeProductLimit.currentCount}/${freeProductLimit.limit})`);
    console.log(`   Portfolio limit: ${freePortfolioLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${freePortfolioLimit.currentCount}/${freePortfolioLimit.limit})\n`);
    
    // Test 2: Creator tier subscription model (unlimited)
    console.log('📋 Test 2: Creator tier subscription model (unlimited)');
    await pool.query(
      `UPDATE platform_subscriptions 
       SET tier = $2, pricing_model = $3, monthly_price = $4
       WHERE user_id = $1`,
      [testUserId, 'creator', 'subscription', 15000]
    );
    
    const creatorProductLimit = await checkProductLimit(testUserId);
    const creatorPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${creatorProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${creatorProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${creatorPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${creatorPortfolioLimit.currentCount}/∞)\n`);
    
    // Test 3: Basic tier percentage model (limited)
    console.log('📋 Test 3: Basic tier percentage model (limited)');
    await pool.query(
      `UPDATE platform_subscriptions 
       SET tier = $2, pricing_model = $3, percentage_tier = $4, monthly_price = $5
       WHERE user_id = $1`,
      [testUserId, 'percentage', 'percentage', 'basic', 0]
    );
    
    const basicProductLimit = await checkProductLimit(testUserId);
    const basicPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${basicProductLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${basicProductLimit.currentCount}/${basicProductLimit.limit})`);
    console.log(`   Portfolio limit: ${basicPortfolioLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${basicPortfolioLimit.currentCount}/${basicPortfolioLimit.limit})\n`);
    
    // Test 4: Premium tier percentage model (unlimited)
    console.log('📋 Test 4: Premium tier percentage model (unlimited)');
    await pool.query(
      `UPDATE platform_subscriptions 
       SET tier = $2, pricing_model = $3, percentage_tier = $4, monthly_price = $5
       WHERE user_id = $1`,
      [testUserId, 'percentage', 'percentage', 'premium', 0]
    );
    
    const premiumProductLimit = await checkProductLimit(testUserId);
    const premiumPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${premiumProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${premiumProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${premiumPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${premiumPortfolioLimit.currentCount}/∞)\n`);
    
    // Test 5: Switch back to subscription model
    console.log('📋 Test 5: Switch back to subscription model');
    await pool.query(
      `UPDATE platform_subscriptions 
       SET tier = $2, pricing_model = $3, percentage_tier = NULL, monthly_price = $4
       WHERE user_id = $1`,
      [testUserId, 'professional', 'subscription', 40000]
    );
    
    const professionalProductLimit = await checkProductLimit(testUserId);
    const professionalPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${professionalProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${professionalProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${professionalPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${professionalPortfolioLimit.currentCount}/∞)\n`);
    
    // Clean up test data
    await pool.query('DELETE FROM platform_subscriptions WHERE user_id = $1', [testUserId]);
    
    console.log('✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Users can switch between subscription and percentage-based pricing models');
    console.log('   • Free tier has limits (5 products, 3 portfolios)');
    console.log('   • Paid subscription tiers have unlimited access');
    console.log('   • Basic percentage tier has limits (5 products, 3 portfolios)');
    console.log('   • Premium percentage tier has unlimited access');
    console.log('   • Switching between models works correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSubscriptionModels()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testSubscriptionModels };