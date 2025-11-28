/**
 * Test Payout Requests
 * 
 * This script tests the payout request functionality:
 * 1. Check user earnings
 * 2. Get payout methods
 * 3. Create a payout request
 * 4. Verify payout request was created
 */

// Use production API by default, or localhost if running locally
const API_BASE_URL = process.env.API_URL || process.env.VITE_API_URL || 'https://www.blinno.app/api';

// Test credentials - UPDATE THESE
// Set via environment variables: TEST_EMAIL and TEST_PASSWORD
// Or edit these values directly
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

if (TEST_EMAIL === 'test@example.com' || TEST_PASSWORD === 'testpassword123') {
  console.warn('\n⚠️  WARNING: Using default test credentials!');
  console.warn('   Please set TEST_EMAIL and TEST_PASSWORD environment variables');
  console.warn('   or edit the script to use your actual credentials.\n');
  console.warn('   Example:');
  console.warn('   export TEST_EMAIL="your-email@example.com"');
  console.warn('   export TEST_PASSWORD="your-password"');
  console.warn('   node test-payout-requests.js\n');
}

let authToken = null;

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  console.log(`   → ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to API at ${url}. Make sure the server is running or check the API_BASE_URL.`);
    }
    throw error;
  }
}

async function login() {
  console.log('🔐 Logging in...');
  try {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    
    authToken = result.token;
    console.log('✅ Login successful');
    console.log(`   User: ${result.user?.email || 'N/A'}`);
    return result;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.message.includes('500')) {
      console.error('   This might be due to invalid credentials or server issues.');
      console.error('   Please check:');
      console.error('   1. Your email and password are correct');
      console.error('   2. Your account is verified');
      console.error('   3. The API server is running and accessible');
    }
    throw error;
  }
}

async function getEarnings() {
  console.log('\n💰 Fetching earnings...');
  try {
    const earnings = await apiRequest('/revenue/earnings');
    console.log('✅ Earnings retrieved:');
    console.log(`   Total Earnings: USD ${earnings.totalEarnings || 0}`);
    console.log(`   Pending Earnings: USD ${earnings.pendingEarnings || 0}`);
    console.log(`   Paid Out: USD ${earnings.paidOut || 0}`);
    console.log(`   Pending Count: ${earnings.pendingCount || 0}`);
    console.log(`   Paid Count: ${earnings.paidCount || 0}`);
    
    if (earnings.byType && earnings.byType.length > 0) {
      console.log('\n   Earnings by Type:');
      earnings.byType.forEach(type => {
        console.log(`     ${type.transaction_type}: USD ${type.earnings} (${type.count} transactions)`);
      });
    }
    
    return earnings;
  } catch (error) {
    console.error('❌ Failed to get earnings:', error.message);
    throw error;
  }
}

async function getPayoutMethods() {
  console.log('\n💳 Fetching payout methods...');
  try {
    const methods = await apiRequest('/revenue/payout-methods');
    console.log(`✅ Found ${methods.length} payout method(s):`);
    
    methods.forEach((method, index) => {
      console.log(`\n   Method ${index + 1}:`);
      console.log(`     ID: ${method.id}`);
      console.log(`     Type: ${method.method_type}`);
      console.log(`     Default: ${method.is_default ? 'Yes' : 'No'}`);
      
      if (method.method_type === 'mobile_money') {
        console.log(`     Operator: ${method.mobile_operator || 'N/A'}`);
        console.log(`     Number: ${method.mobile_number || 'N/A'}`);
      } else {
        console.log(`     Bank: ${method.bank_name || 'N/A'}`);
        console.log(`     Account Name: ${method.account_name || 'N/A'}`);
        console.log(`     Account Number: ${method.account_number || 'N/A'}`);
      }
    });
    
    return methods;
  } catch (error) {
    console.error('❌ Failed to get payout methods:', error.message);
    throw error;
  }
}

async function createPayoutRequest(methodId, amount) {
  console.log(`\n📤 Creating payout request...`);
  console.log(`   Amount: USD ${amount}`);
  console.log(`   Method ID: ${methodId}`);
  
  try {
    const result = await apiRequest('/revenue/request-payout', {
      method: 'POST',
      body: JSON.stringify({
        amount: amount,
        paymentMethodId: methodId,
      }),
    });
    
    console.log('✅ Payout request created successfully!');
    console.log(`   Payout ID: ${result.payout?.id || 'N/A'}`);
    console.log(`   Status: ${result.payout?.status || 'N/A'}`);
    console.log(`   Amount: USD ${result.payout?.amount || 'N/A'}`);
    console.log(`   Currency: ${result.payout?.currency || 'N/A'}`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to create payout request:', error.message);
    throw error;
  }
}

async function getPayoutHistory() {
  console.log('\n📋 Fetching payout history...');
  try {
    const history = await apiRequest('/revenue/my-payouts');
    console.log(`✅ Found ${history.length} payout(s) in history:`);
    
    if (history.length === 0) {
      console.log('   No payout history found.');
      return [];
    }
    
    history.forEach((payout, index) => {
      console.log(`\n   Payout ${index + 1}:`);
      console.log(`     ID: ${payout.id}`);
      console.log(`     Amount: USD ${payout.amount}`);
      console.log(`     Status: ${payout.status}`);
      console.log(`     Payment Method: ${payout.payment_method || 'N/A'}`);
      console.log(`     Created: ${new Date(payout.created_at).toLocaleString()}`);
      if (payout.processed_at) {
        console.log(`     Processed: ${new Date(payout.processed_at).toLocaleString()}`);
      }
    });
    
    return history;
  } catch (error) {
    console.error('❌ Failed to get payout history:', error.message);
    throw error;
  }
}

async function testPayoutFlow() {
  console.log('🧪 Testing Payout Request Flow\n');
  console.log('='.repeat(50));
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log(`👤 Test Email: ${TEST_EMAIL}`);
  console.log('='.repeat(50));
  
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Get earnings
    const earnings = await getEarnings();
    
    if (!earnings || earnings.pendingEarnings < 25) {
      console.log('\n⚠️  WARNING: Insufficient earnings for payout test');
      console.log(`   Minimum required: USD 25`);
      console.log(`   Available: USD ${earnings?.pendingEarnings || 0}`);
      console.log('\n   To test payouts, you need:');
      console.log('   1. Complete some transactions (bookings, sales, etc.)');
      console.log('   2. Wait for payments to be processed');
      console.log('   3. Ensure you have at least USD 25 in pending earnings');
      return;
    }
    
    // Step 3: Get payout methods
    const methods = await getPayoutMethods();
    
    if (!methods || methods.length === 0) {
      console.log('\n⚠️  WARNING: No payout methods found');
      console.log('\n   To test payouts, you need to:');
      console.log('   1. Add a payout method in your dashboard');
      console.log('   2. Go to Settings > Payout Methods');
      console.log('   3. Add either Mobile Money or Bank Transfer');
      return;
    }
    
    // Step 4: Get payout history (before)
    await getPayoutHistory();
    
    // Step 5: Create a test payout request
    const testAmount = Math.min(earnings.pendingEarnings, 50); // Test with $50 or available amount
    const defaultMethod = methods.find(m => m.is_default) || methods[0];
    
    console.log('\n' + '='.repeat(50));
    console.log('📝 Creating Test Payout Request');
    console.log('='.repeat(50));
    console.log(`   Using method: ${defaultMethod.method_type}`);
    if (defaultMethod.method_type === 'mobile_money') {
      console.log(`   Mobile: ${defaultMethod.mobile_operator} - ${defaultMethod.mobile_number}`);
    } else {
      console.log(`   Bank: ${defaultMethod.bank_name} - ${defaultMethod.account_number}`);
    }
    
    await createPayoutRequest(defaultMethod.id, testAmount);
    
    // Step 6: Get payout history (after)
    console.log('\n' + '='.repeat(50));
    await getPayoutHistory();
    
    // Step 7: Verify earnings updated
    console.log('\n' + '='.repeat(50));
    console.log('🔄 Verifying earnings after payout request...');
    const updatedEarnings = await getEarnings();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Payout Request Test Completed Successfully!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   Initial Pending: USD ${earnings.pendingEarnings}`);
    console.log(`   Current Pending: USD ${updatedEarnings.pendingEarnings}`);
    console.log(`   Requested: USD ${testAmount}`);
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Test Failed:', error.message);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

// Run the test
testPayoutFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { testPayoutFlow };

