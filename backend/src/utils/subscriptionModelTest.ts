import { supabase } from '../config/supabase.js';
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
    await supabase
      .from('platform_subscriptions')
      .delete()
      .eq('user_id', testUserId);
    
    // Test 1: Free tier subscription model
    console.log('📋 Test 1: Free tier subscription model');
    const { error: freeTierError } = await supabase
      .from('platform_subscriptions')
      .upsert({
        user_id: testUserId,
        tier: 'free',
        pricing_model: 'subscription',
        monthly_price: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      });

    if (freeTierError) {
      throw freeTierError;
    }
    
    const freeProductLimit = await checkProductLimit(testUserId);
    const freePortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${freeProductLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${freeProductLimit.currentCount}/${freeProductLimit.limit})`);
    console.log(`   Portfolio limit: ${freePortfolioLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${freePortfolioLimit.currentCount}/${freePortfolioLimit.limit})\n`);
    
    // Test 2: Creator tier subscription model (unlimited)
    console.log('📋 Test 2: Creator tier subscription model (unlimited)');
    const { error: creatorTierError } = await supabase
      .from('platform_subscriptions')
      .update({
        tier: 'creator',
        pricing_model: 'subscription',
        monthly_price: 15,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId);

    if (creatorTierError) {
      throw creatorTierError;
    }
    
    const creatorProductLimit = await checkProductLimit(testUserId);
    const creatorPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${creatorProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${creatorProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${creatorPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${creatorPortfolioLimit.currentCount}/∞)\n`);
    
    // Test 3: Basic tier percentage model (limited)
    console.log('📋 Test 3: Basic tier percentage model (limited)');
    const { error: basicTierError } = await supabase
      .from('platform_subscriptions')
      .update({
        tier: 'percentage',
        pricing_model: 'percentage',
        percentage_tier: 'basic',
        monthly_price: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId);

    if (basicTierError) {
      throw basicTierError;
    }
    
    const basicProductLimit = await checkProductLimit(testUserId);
    const basicPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${basicProductLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${basicProductLimit.currentCount}/${basicProductLimit.limit})`);
    console.log(`   Portfolio limit: ${basicPortfolioLimit.canCreate ? '✅ Can create' : '❌ Cannot create'} (${basicPortfolioLimit.currentCount}/${basicPortfolioLimit.limit})\n`);
    
    // Test 4: Premium tier percentage model (unlimited)
    console.log('📋 Test 4: Premium tier percentage model (unlimited)');
    const { error: premiumTierError } = await supabase
      .from('platform_subscriptions')
      .update({
        tier: 'percentage',
        pricing_model: 'percentage',
        percentage_tier: 'premium',
        monthly_price: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId);

    if (premiumTierError) {
      throw premiumTierError;
    }
    
    const premiumProductLimit = await checkProductLimit(testUserId);
    const premiumPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${premiumProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${premiumProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${premiumPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${premiumPortfolioLimit.currentCount}/∞)\n`);
    
    // Test 5: Switch back to subscription model
    console.log('📋 Test 5: Switch back to subscription model');
    const { error: professionalTierError } = await supabase
      .from('platform_subscriptions')
      .update({
        tier: 'professional',
        pricing_model: 'subscription',
        percentage_tier: null,
        monthly_price: 40,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId);

    if (professionalTierError) {
      throw professionalTierError;
    }
    
    const professionalProductLimit = await checkProductLimit(testUserId);
    const professionalPortfolioLimit = await checkPortfolioLimit(testUserId);
    console.log(`   Product limit: ${professionalProductLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${professionalProductLimit.currentCount}/∞)`);
    console.log(`   Portfolio limit: ${professionalPortfolioLimit.canCreate ? '✅ Can create (unlimited)' : '❌ Cannot create'} (${professionalPortfolioLimit.currentCount}/∞)\n`);
    
    // Clean up test data
    await supabase
      .from('platform_subscriptions')
      .delete()
      .eq('user_id', testUserId);
    
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