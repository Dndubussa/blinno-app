import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { financialTracking } from '../services/financialTracking.js';
import ClickPesaService from '../services/clickpesa.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Click Pesa service
const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

/**
 * Get platform revenue summary (Admin only)
 */
router.get('/summary', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Total revenue - using RPC or manual aggregation
    let revenueQuery = supabase
      .from('platform_fees')
      .select('subtotal, platform_fee, payment_processing_fee, creator_payout')
      .eq('status', 'collected');

    if (startDate) {
      revenueQuery = revenueQuery.gte('created_at', startDate as string);
    }
    if (endDate) {
      revenueQuery = revenueQuery.lte('created_at', endDate as string);
    }

    const { data: revenueData, error: revenueError } = await revenueQuery;

    if (revenueError) {
      throw revenueError;
    }

    // Calculate aggregations manually
    const summary = (revenueData || []).reduce((acc: any, fee: any) => {
      acc.total_revenue = (acc.total_revenue || 0) + parseFloat(fee.subtotal || 0);
      acc.total_platform_fees = (acc.total_platform_fees || 0) + parseFloat(fee.platform_fee || 0);
      acc.total_processing_fees = (acc.total_processing_fees || 0) + parseFloat(fee.payment_processing_fee || 0);
      acc.total_payouts = (acc.total_payouts || 0) + parseFloat(fee.creator_payout || 0);
      acc.transaction_count = (acc.transaction_count || 0) + 1;
      return acc;
    }, {});

    // Revenue by transaction type
    const byTypeMap = new Map<string, { count: number; revenue: number; fees: number }>();
    (revenueData || []).forEach((fee: any) => {
      const type = fee.transaction_type || 'unknown';
      const existing = byTypeMap.get(type) || { count: 0, revenue: 0, fees: 0 };
      byTypeMap.set(type, {
        count: existing.count + 1,
        revenue: existing.revenue + parseFloat(fee.subtotal || 0),
        fees: existing.fees + parseFloat(fee.platform_fee || 0),
      });
    });

    const byType = Array.from(byTypeMap.entries()).map(([transaction_type, data]) => ({
      transaction_type,
      count: data.count,
      revenue: data.revenue,
      fees: data.fees,
    }));

    // Subscription revenue
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('platform_subscriptions')
      .select('monthly_price')
      .eq('status', 'active');

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscriptions = {
      active_subscriptions: subscriptionData?.length || 0,
      monthly_recurring_revenue: (subscriptionData || []).reduce((sum: number, sub: any) => 
        sum + (parseFloat(sub.monthly_price || 0)), 0
      ),
    };

    // Featured listings revenue
    const { data: featuredData, error: featuredError } = await supabase
      .from('featured_listings')
      .select('price_paid')
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString());

    if (featuredError) {
      throw featuredError;
    }

    const featuredListings = {
      active_listings: featuredData?.length || 0,
      total_revenue: (featuredData || []).reduce((sum: number, listing: any) => 
        sum + (parseFloat(listing.price_paid || 0)), 0
      ),
    };

    res.json({
      summary,
      byType,
      subscriptions,
      featuredListings,
    });
  } catch (error: any) {
    console.error('Get revenue summary error:', error);
    res.status(500).json({ error: 'Failed to get revenue summary' });
  }
});

/**
 * Get creator payout summary
 */
router.get('/payouts', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { status, creatorId } = req.query;

    let query = supabase
      .from('creator_payouts')
      .select(`
        *,
        creator:users!creator_payouts_creator_id_fkey(email),
        creator_profile:profiles!creator_payouts_creator_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    }
    if (creatorId) {
      query = query.eq('creator_id', creatorId as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((cp: any) => ({
      ...cp,
      email: cp.creator?.email,
      display_name: cp.creator_profile?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

/**
 * Get pending fees for a creator
 */
router.get('/pending/:creatorId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { creatorId } = req.params;

    // Users can only view their own pending fees
    if (req.userId !== creatorId && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('platform_fees')
      .select('creator_payout')
      .eq('user_id', creatorId)
      .eq('payout_status', 'pending')
      .eq('status', 'collected');

    if (error) {
      throw error;
    }

    const total_pending = (data || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout || 0)), 0
    );
    const transaction_count = data?.length || 0;

    res.json({ total_pending, transaction_count });
  } catch (error: any) {
    console.error('Get pending fees error:', error);
    res.status(500).json({ error: 'Failed to get pending fees' });
  }
});

/**
 * Get creator earnings summary (for creators)
 */
router.get('/earnings', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get total earnings (all collected fees)
    const { data: totalEarningsData, error: totalError } = await supabase
      .from('platform_fees')
      .select('creator_payout')
      .eq('user_id', req.userId)
      .eq('status', 'collected');

    if (totalError) {
      throw totalError;
    }

    const totalEarnings = (totalEarningsData || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout || 0)), 0
    );
    const totalTransactions = totalEarningsData?.length || 0;

    // Get pending earnings (not yet paid out)
    const { data: pendingEarningsData, error: pendingError } = await supabase
      .from('platform_fees')
      .select('creator_payout')
      .eq('user_id', req.userId)
      .eq('payout_status', 'pending')
      .eq('status', 'collected');

    if (pendingError) {
      throw pendingError;
    }

    const pendingEarnings = (pendingEarningsData || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout || 0)), 0
    );
    const pendingCount = pendingEarningsData?.length || 0;

    // Get paid out earnings
    const { data: paidOutData, error: paidOutError } = await supabase
      .from('platform_fees')
      .select('creator_payout')
      .eq('user_id', req.userId)
      .eq('payout_status', 'paid');

    if (paidOutError) {
      throw paidOutError;
    }

    const paidOut = (paidOutData || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout || 0)), 0
    );
    const paidCount = paidOutData?.length || 0;

    // Get earnings by transaction type
    const { data: byTypeData, error: byTypeError } = await supabase
      .from('platform_fees')
      .select('transaction_type, creator_payout')
      .eq('user_id', req.userId)
      .eq('status', 'collected');

    if (byTypeError) {
      throw byTypeError;
    }

    const byTypeMap = new Map<string, { earnings: number; count: number }>();
    (byTypeData || []).forEach((fee: any) => {
      const type = fee.transaction_type || 'unknown';
      const existing = byTypeMap.get(type) || { earnings: 0, count: 0 };
      byTypeMap.set(type, {
        earnings: existing.earnings + parseFloat(fee.creator_payout || 0),
        count: existing.count + 1,
      });
    });

    const byType = Array.from(byTypeMap.entries()).map(([transaction_type, data]) => ({
      transaction_type,
      earnings: data.earnings,
      count: data.count,
    }));

    // Get payout history
    const { data: payoutHistory, error: payoutHistoryError } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (payoutHistoryError) {
      throw payoutHistoryError;
    }

    res.json({
      totalEarnings,
      totalTransactions,
      pendingEarnings,
      pendingCount,
      paidOut,
      paidCount,
      byType,
      payoutHistory: payoutHistory || [],
    });
  } catch (error: any) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

/**
 * Get user's payout methods
 */
router.get('/payout-methods', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('user_payout_methods')
      .select('*')
      .eq('user_id', req.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get payout methods error:', error);
    res.status(500).json({ error: 'Failed to get payout methods' });
  }
});

/**
 * Add a new payout method
 */
router.post('/payout-methods', authenticate, async (req: AuthRequest, res) => {
  try {
    const { methodType, isDefault, ...methodDetails } = req.body;

    if (!methodType) {
      return res.status(400).json({ error: 'Method type is required' });
    }

    // Validate method type
    if (!['mobile_money', 'bank_transfer'].includes(methodType)) {
      return res.status(400).json({ error: 'Invalid method type' });
    }

    // Validate required fields based on method type
    if (methodType === 'mobile_money') {
      if (!methodDetails.mobileOperator || !methodDetails.mobileNumber) {
        return res.status(400).json({ error: 'Mobile operator and number are required for mobile money' });
      }
      
      // Validate mobile operator
      const validOperators = ['M-Pesa', 'Mixx by Yas', 'Airtel Money', 'Halopesa'];
      if (!validOperators.includes(methodDetails.mobileOperator)) {
        return res.status(400).json({ error: 'Invalid mobile operator' });
      }
    } else if (methodType === 'bank_transfer') {
      if (!methodDetails.bankName || !methodDetails.accountName || !methodDetails.accountNumber) {
        return res.status(400).json({ error: 'Bank name, account name, and account number are required for bank transfer' });
      }
    }

    // If setting as default, unset existing default
    if (isDefault) {
      await supabase
        .from('user_payout_methods')
        .update({ is_default: false })
        .eq('user_id', req.userId);
    }

    // Insert new payout method
    const { data, error } = await supabase
      .from('user_payout_methods')
      .insert({
        user_id: req.userId,
        method_type: methodType,
        is_default: isDefault || false,
        mobile_operator: methodDetails.mobileOperator || null,
        mobile_number: methodDetails.mobileNumber || null,
        bank_name: methodDetails.bankName || null,
        bank_address: methodDetails.bankAddress || null,
        account_name: methodDetails.accountName || null,
        account_number: methodDetails.accountNumber || null,
        swift_code: methodDetails.swiftCode || null,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: 'This payout method already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Add payout method error:', error);
    res.status(500).json({ error: 'Failed to add payout method' });
  }
});

/**
 * Update a payout method
 */
router.put('/payout-methods/:methodId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { methodId } = req.params;
    const { isDefault, ...methodDetails } = req.body;

    // Verify the method belongs to the user
    const { data: existing, error: existingError } = await supabase
      .from('user_payout_methods')
      .select('*')
      .eq('id', methodId)
      .eq('user_id', req.userId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // If setting as default, unset existing default
    if (isDefault) {
      await supabase
        .from('user_payout_methods')
        .update({ is_default: false })
        .eq('user_id', req.userId)
        .neq('id', methodId);
    }

    // Update the payout method
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (isDefault !== undefined) updates.is_default = isDefault;
    if (methodDetails.mobileOperator !== undefined) updates.mobile_operator = methodDetails.mobileOperator;
    if (methodDetails.mobileNumber !== undefined) updates.mobile_number = methodDetails.mobileNumber;
    if (methodDetails.bankName !== undefined) updates.bank_name = methodDetails.bankName;
    if (methodDetails.bankAddress !== undefined) updates.bank_address = methodDetails.bankAddress;
    if (methodDetails.accountName !== undefined) updates.account_name = methodDetails.accountName;
    if (methodDetails.accountNumber !== undefined) updates.account_number = methodDetails.accountNumber;
    if (methodDetails.swiftCode !== undefined) updates.swift_code = methodDetails.swiftCode;

    const { data, error } = await supabase
      .from('user_payout_methods')
      .update(updates)
      .eq('id', methodId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update payout method error:', error);
    res.status(500).json({ error: 'Failed to update payout method' });
  }
});

/**
 * Delete a payout method
 */
router.delete('/payout-methods/:methodId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { methodId } = req.params;

    // Verify the method belongs to the user
    const { data: existing, error: existingError } = await supabase
      .from('user_payout_methods')
      .select('*')
      .eq('id', methodId)
      .eq('user_id', req.userId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // Delete the payout method
    const { error } = await supabase
      .from('user_payout_methods')
      .delete()
      .eq('id', methodId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Payout method deleted successfully' });
  } catch (error: any) {
    console.error('Delete payout method error:', error);
    res.status(500).json({ error: 'Failed to delete payout method' });
  }
});

/**
 * Set a payout method as default
 */
router.post('/payout-methods/:methodId/default', authenticate, async (req: AuthRequest, res) => {
  try {
    const { methodId } = req.params;

    // Verify the method belongs to the user
    const { data: existing, error: existingError } = await supabase
      .from('user_payout_methods')
      .select('*')
      .eq('id', methodId)
      .eq('user_id', req.userId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // Unset existing default
    await supabase
      .from('user_payout_methods')
      .update({ is_default: false })
      .eq('user_id', req.userId);

    // Set this method as default
    const { data, error } = await supabase
      .from('user_payout_methods')
      .update({
        is_default: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', methodId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Set default payout method error:', error);
    res.status(500).json({ error: 'Failed to set default payout method' });
  }
});

/**
 * Request a payout (Creators)
 */
router.post('/request-payout', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, paymentMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Verify the payment method belongs to the user
    const { data: paymentMethod, error: methodError } = await supabase
      .from('user_payout_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('user_id', req.userId)
      .single();

    if (methodError || !paymentMethod) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Get available pending earnings
    const { data: pendingData, error: pendingError } = await supabase
      .from('platform_fees')
      .select('id, creator_payout')
      .eq('user_id', req.userId)
      .eq('payout_status', 'pending')
      .eq('status', 'collected');

    if (pendingError) {
      throw pendingError;
    }

    const available = (pendingData || []).reduce((sum: number, fee: any) => 
      sum + (parseFloat(fee.creator_payout || 0)), 0
    );
    const feeIds = (pendingData || []).map((fee: any) => fee.id);

    if (amount > available) {
      return res.status(400).json({ 
        error: `Insufficient funds. Available: ${available} TZS` 
      });
    }

    // Check minimum payout amount (e.g., 10,000 TZS)
    const MIN_PAYOUT = 10000;
    if (amount < MIN_PAYOUT) {
      return res.status(400).json({ 
        error: `Minimum payout amount is ${MIN_PAYOUT} TZS` 
      });
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .insert({
        creator_id: req.userId,
        amount,
        currency: 'TZS',
        status: 'pending',
        payment_method: paymentMethod.method_type,
        payment_reference: JSON.stringify({
          methodId: paymentMethod.id,
          methodType: paymentMethod.method_type,
          mobileOperator: paymentMethod.mobile_operator,
          mobileNumber: paymentMethod.mobile_number,
          bankName: paymentMethod.bank_name,
          accountName: paymentMethod.account_name,
          accountNumber: paymentMethod.account_number,
        }),
        fee_ids: feeIds,
      })
      .select()
      .single();

    if (payoutError) {
      throw payoutError;
    }

    res.status(201).json({
      message: 'Payout request submitted successfully',
      payout: payout,
    });
  } catch (error: any) {
    console.error('Request payout error:', error);
    res.status(500).json({ error: 'Failed to request payout' });
  }
});

/**
 * Get creator's payout history
 */
router.get('/my-payouts', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('*')
        .eq('creator_id', req.userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (dbError: any) {
      console.error('Database error in get my payouts:', dbError);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  } catch (error: any) {
    console.error('Get my payouts error:', error);
    res.status(500).json({ error: 'Failed to get payout history', details: error.message });
  }
});

/**
 * Process/Approve a payout (Admin only)
 */
router.post('/payouts/:payoutId/process', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: `Payout is already ${payout.status}` });
    }

    // Update payout status to processing
    await supabase
      .from('creator_payouts')
      .update({
        status: 'processing',
        notes: notes || payout.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    // Mark associated fees as processing
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await supabase
        .from('platform_fees')
        .update({
          payout_status: 'processing',
          payout_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', payout.fee_ids);
    }

    res.json({ 
      message: 'Payout processing initiated',
      payout: { ...payout, status: 'processing' }
    });
  } catch (error: any) {
    console.error('Process payout error:', error);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

/**
 * Complete a payout (Admin only) - after actual payment is made
 */
router.post('/payouts/:payoutId/complete', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status !== 'processing') {
      return res.status(400).json({ error: `Payout must be in processing status. Current: ${payout.status}` });
    }

    // Get payment method details
    let paymentMethodDetails: any = {};
    try {
      paymentMethodDetails = typeof payout.payment_reference === 'string' 
        ? JSON.parse(payout.payment_reference) 
        : payout.payment_reference;
    } catch (e) {
      console.error('Error parsing payment reference:', e);
    }

    // Process payout through Click Pesa
    let disbursementResponse = null;
    let paymentReference = null;

    if (payout.payment_method === 'mobile_money' && paymentMethodDetails.mobileNumber) {
      // Process mobile money disbursement
      disbursementResponse = await clickPesa.createDisbursement({
        amount: parseFloat(payout.amount.toString()),
        currency: 'TZS',
        recipientPhone: paymentMethodDetails.mobileNumber,
        recipientName: paymentMethodDetails.accountName || 'Creator',
        description: `Payout for earnings on BLINNO platform`,
        callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/revenue/payouts/webhook`,
      });
      
      if (disbursementResponse.success) {
        paymentReference = disbursementResponse.disbursementId;
      }
    } else if (payout.payment_method === 'bank_transfer' && paymentMethodDetails.accountNumber) {
      // For bank transfers, we would typically use a different API or manual process
      // For now, we'll mark it as processed with a note
      paymentReference = 'BANK_TRANSFER_PENDING';
    } else {
      return res.status(400).json({ error: 'Invalid payment method details' });
    }

    // Check if disbursement was successful
    if (disbursementResponse && !disbursementResponse.success) {
      // Update payout status to failed
      await supabase
        .from('creator_payouts')
        .update({
          status: 'failed',
          notes: disbursementResponse.error || payout.notes || 'Disbursement failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      // Mark associated fees back to pending
      if (payout.fee_ids && payout.fee_ids.length > 0) {
        await supabase
          .from('platform_fees')
          .update({
            payout_status: 'pending',
            payout_date: null,
            updated_at: new Date().toISOString(),
          })
          .in('id', payout.fee_ids);
      }

      return res.status(400).json({ 
        error: disbursementResponse.error || 'Failed to process disbursement' 
      });
    }

    // Get balance before payout
    const balanceBefore = await financialTracking.getUserBalance(payout.creator_id);
    const balanceBeforeAmount = balanceBefore?.available_balance || 0;

    // Record payout transaction
    const transactionId = await financialTracking.recordPayout(
      payout.creator_id,
      parseFloat(payout.amount.toString()),
      payoutId,
      `Payout via ${payout.payment_method}`
    );

    // Get balance after payout
    const balanceAfter = await financialTracking.getUserBalance(payout.creator_id);
    const balanceAfterAmount = balanceAfter?.available_balance || 0;

    // Update payout status to paid
    await supabase
      .from('creator_payouts')
      .update({
        status: 'paid',
        payment_reference: paymentReference,
        notes: notes || payout.notes,
        transaction_id: transactionId,
        balance_before: balanceBeforeAmount,
        balance_after: balanceAfterAmount,
        processed_at: new Date().toISOString(),
        payout_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    // Mark associated fees as paid
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await supabase
        .from('platform_fees')
        .update({
          payout_status: 'paid',
          payout_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', payout.fee_ids);
    }

    res.json({ 
      message: 'Payout completed successfully',
      payout: { ...payout, status: 'paid' }
    });
  } catch (error: any) {
    console.error('Complete payout error:', error);
    res.status(500).json({ error: 'Failed to complete payout' });
  }
});

/**
 * Cancel a payout (Admin only)
 */
router.post('/payouts/:payoutId/cancel', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid payout' });
    }

    // Update payout status to cancelled
    await supabase
      .from('creator_payouts')
      .update({
        status: 'cancelled',
        notes: notes || payout.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    // Mark associated fees back to pending
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await supabase
        .from('platform_fees')
        .update({
          payout_status: 'pending',
          payout_date: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', payout.fee_ids);
    }

    res.json({ 
      message: 'Payout cancelled successfully',
      payout: { ...payout, status: 'cancelled' }
    });
  } catch (error: any) {
    console.error('Cancel payout error:', error);
    res.status(500).json({ error: 'Failed to cancel payout' });
  }
});

export default router;
