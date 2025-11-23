import express from 'express';
import { pool } from '../config/database.js';
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

    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      params.push(startDate, endDate);
    }

    // Total revenue
    const revenueResult = await pool.query(
      `SELECT 
        SUM(subtotal) as total_revenue,
        SUM(platform_fee) as total_platform_fees,
        SUM(payment_processing_fee) as total_processing_fees,
        SUM(creator_payout) as total_payouts,
        COUNT(*) as transaction_count
       FROM platform_fees
       ${dateFilter}
       ${dateFilter ? '' : 'WHERE status = $1'}
       ${dateFilter ? 'AND status = $3' : ''}`,
      dateFilter ? [...params, 'collected'] : ['collected']
    );

    // Revenue by transaction type
    const byTypeResult = await pool.query(
      `SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(subtotal) as revenue,
        SUM(platform_fee) as fees
       FROM platform_fees
       ${dateFilter}
       ${dateFilter ? '' : 'WHERE status = $1'}
       ${dateFilter ? 'AND status = $3' : ''}
       GROUP BY transaction_type`,
      dateFilter ? [...params, 'collected'] : ['collected']
    );

    // Subscription revenue
    const subscriptionResult = await pool.query(
      `SELECT 
        COUNT(*) as active_subscriptions,
        SUM(monthly_price) as monthly_recurring_revenue
       FROM platform_subscriptions
       WHERE status = 'active'`
    );

    // Featured listings revenue
    const featuredResult = await pool.query(
      `SELECT 
        COUNT(*) as active_listings,
        SUM(price_paid) as total_revenue
       FROM featured_listings
       WHERE status = 'active' AND end_date > now()`
    );

    res.json({
      summary: revenueResult.rows[0],
      byType: byTypeResult.rows,
      subscriptions: subscriptionResult.rows[0],
      featuredListings: featuredResult.rows[0],
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

    let query = `
      SELECT cp.*, u.email, p.display_name
      FROM creator_payouts cp
      JOIN users u ON cp.creator_id = u.id
      LEFT JOIN profiles p ON cp.creator_id = p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND cp.status = $${paramCount++}`;
      params.push(status);
    }
    if (creatorId) {
      query += ` AND cp.creator_id = $${paramCount++}`;
      params.push(creatorId);
    }

    query += ` ORDER BY cp.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
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

    const result = await pool.query(
      `SELECT 
        SUM(creator_payout) as total_pending,
        COUNT(*) as transaction_count
       FROM platform_fees
       WHERE user_id = $1 AND payout_status = 'pending' AND status = 'collected'`,
      [creatorId]
    );

    res.json(result.rows[0] || { total_pending: 0, transaction_count: 0 });
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
    const totalEarningsResult = await pool.query(
      `SELECT 
        SUM(creator_payout) as total_earnings,
        COUNT(*) as transaction_count
       FROM platform_fees
       WHERE user_id = $1 AND status = 'collected'`,
      [req.userId]
    );

    // Get pending earnings (not yet paid out)
    const pendingEarningsResult = await pool.query(
      `SELECT 
        SUM(creator_payout) as pending_earnings,
        COUNT(*) as pending_count
       FROM platform_fees
       WHERE user_id = $1 AND payout_status = 'pending' AND status = 'collected'`,
      [req.userId]
    );

    // Get paid out earnings
    const paidOutResult = await pool.query(
      `SELECT 
        SUM(creator_payout) as paid_out,
        COUNT(*) as paid_count
       FROM platform_fees
       WHERE user_id = $1 AND payout_status = 'paid'`,
      [req.userId]
    );

    // Get earnings by transaction type
    const byTypeResult = await pool.query(
      `SELECT 
        transaction_type,
        SUM(creator_payout) as earnings,
        COUNT(*) as count
       FROM platform_fees
       WHERE user_id = $1 AND status = 'collected'
       GROUP BY transaction_type`,
      [req.userId]
    );

    // Get payout history
    const payoutHistoryResult = await pool.query(
      `SELECT * FROM creator_payouts
       WHERE creator_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.userId]
    );

    res.json({
      totalEarnings: parseFloat(totalEarningsResult.rows[0]?.total_earnings || 0),
      totalTransactions: parseInt(totalEarningsResult.rows[0]?.transaction_count || 0),
      pendingEarnings: parseFloat(pendingEarningsResult.rows[0]?.pending_earnings || 0),
      pendingCount: parseInt(pendingEarningsResult.rows[0]?.pending_count || 0),
      paidOut: parseFloat(paidOutResult.rows[0]?.paid_out || 0),
      paidCount: parseInt(paidOutResult.rows[0]?.paid_count || 0),
      byType: byTypeResult.rows,
      payoutHistory: payoutHistoryResult.rows,
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
    const result = await pool.query(
      `SELECT * FROM user_payout_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
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
      await pool.query(
        `UPDATE user_payout_methods
         SET is_default = false
         WHERE user_id = $1`,
        [req.userId]
      );
    }

    // Insert new payout method
    const result = await pool.query(
      `INSERT INTO user_payout_methods (
        user_id, method_type, is_default,
        mobile_operator, mobile_number,
        bank_name, bank_address, account_name, account_number, swift_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.userId,
        methodType,
        isDefault || false,
        methodDetails.mobileOperator || null,
        methodDetails.mobileNumber || null,
        methodDetails.bankName || null,
        methodDetails.bankAddress || null,
        methodDetails.accountName || null,
        methodDetails.accountNumber || null,
        methodDetails.swiftCode || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Add payout method error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This payout method already exists' });
    }
    
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
    const existingResult = await pool.query(
      'SELECT * FROM user_payout_methods WHERE id = $1 AND user_id = $2',
      [methodId, req.userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    const existingMethod = existingResult.rows[0];

    // If setting as default, unset existing default
    if (isDefault) {
      await pool.query(
        `UPDATE user_payout_methods
         SET is_default = false
         WHERE user_id = $1 AND id != $2`,
        [req.userId, methodId]
      );
    }

    // Update the payout method
    const result = await pool.query(
      `UPDATE user_payout_methods
       SET is_default = COALESCE($1, is_default),
           mobile_operator = COALESCE($2, mobile_operator),
           mobile_number = COALESCE($3, mobile_number),
           bank_name = COALESCE($4, bank_name),
           bank_address = COALESCE($5, bank_address),
           account_name = COALESCE($6, account_name),
           account_number = COALESCE($7, account_number),
           swift_code = COALESCE($8, swift_code),
           updated_at = now()
       WHERE id = $9
       RETURNING *`,
      [
        isDefault,
        methodDetails.mobileOperator || existingMethod.mobile_operator,
        methodDetails.mobileNumber || existingMethod.mobile_number,
        methodDetails.bankName || existingMethod.bank_name,
        methodDetails.bankAddress || existingMethod.bank_address,
        methodDetails.accountName || existingMethod.account_name,
        methodDetails.accountNumber || existingMethod.account_number,
        methodDetails.swiftCode || existingMethod.swift_code,
        methodId,
      ]
    );

    res.json(result.rows[0]);
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
    const existingResult = await pool.query(
      'SELECT * FROM user_payout_methods WHERE id = $1 AND user_id = $2',
      [methodId, req.userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // Delete the payout method
    await pool.query(
      'DELETE FROM user_payout_methods WHERE id = $1',
      [methodId]
    );

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
    const existingResult = await pool.query(
      'SELECT * FROM user_payout_methods WHERE id = $1 AND user_id = $2',
      [methodId, req.userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // Unset existing default
    await pool.query(
      `UPDATE user_payout_methods
       SET is_default = false
       WHERE user_id = $1`,
      [req.userId]
    );

    // Set this method as default
    const result = await pool.query(
      `UPDATE user_payout_methods
       SET is_default = true,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [methodId]
    );

    res.json(result.rows[0]);
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
    const methodResult = await pool.query(
      'SELECT * FROM user_payout_methods WHERE id = $1 AND user_id = $2',
      [paymentMethodId, req.userId]
    );

    if (methodResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const paymentMethod = methodResult.rows[0];

    // Get available pending earnings
    const pendingResult = await pool.query(
      `SELECT 
        SUM(creator_payout) as available,
        array_agg(id) as fee_ids
       FROM platform_fees
       WHERE user_id = $1 AND payout_status = 'pending' AND status = 'collected'`,
      [req.userId]
    );

    const available = parseFloat(pendingResult.rows[0]?.available || 0);
    const feeIds = pendingResult.rows[0]?.fee_ids || [];

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
    const payoutResult = await pool.query(
      `INSERT INTO creator_payouts (
        creator_id, amount, currency, status, payment_method, payment_reference, fee_ids
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6)
      RETURNING *`,
      [
        req.userId,
        amount,
        'TZS',
        paymentMethod.method_type,
        JSON.stringify({
          methodId: paymentMethod.id,
          methodType: paymentMethod.method_type,
          mobileOperator: paymentMethod.mobile_operator,
          mobileNumber: paymentMethod.mobile_number,
          bankName: paymentMethod.bank_name,
          accountName: paymentMethod.account_name,
          accountNumber: paymentMethod.account_number,
        }),
        feeIds,
      ]
    );

    const payout = payoutResult.rows[0];

    // Mark fees as processing (they'll be marked as paid when payout is processed)
    // For now, we'll mark them when the payout is approved
    // This prevents double-payouts

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
      const result = await pool.query(
        `SELECT * FROM creator_payouts
         WHERE creator_id = $1
         ORDER BY created_at DESC`,
        [req.userId]
      );
      res.json(result.rows);
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
    const payoutResult = await pool.query(
      'SELECT * FROM creator_payouts WHERE id = $1',
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: `Payout is already ${payout.status}` });
    }

    // Update payout status to processing
    await pool.query(
      `UPDATE creator_payouts
       SET status = 'processing',
           notes = $1,
           updated_at = now()
       WHERE id = $2`,
      [notes || null, payoutId]
    );

    // Mark associated fees as processing
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await pool.query(
        `UPDATE platform_fees
         SET payout_status = 'processing',
             payout_date = now(),
             updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [payout.fee_ids]
      );
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
    const payoutResult = await pool.query(
      'SELECT * FROM creator_payouts WHERE id = $1',
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (payout.status !== 'processing') {
      return res.status(400).json({ error: `Payout must be in processing status. Current: ${payout.status}` });
    }

    // Get payment method details
    let paymentMethodDetails: any = {};
    try {
      paymentMethodDetails = JSON.parse(payout.payment_reference);
    } catch (e) {
      console.error('Error parsing payment reference:', e);
    }

    // Process payout through Click Pesa
    let disbursementResponse = null;
    let paymentReference = null;

    if (payout.payment_method === 'mobile_money' && paymentMethodDetails.mobileNumber) {
      // Process mobile money disbursement
      disbursementResponse = await clickPesa.createDisbursement({
        amount: parseFloat(payout.amount),
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
      await pool.query(
        `UPDATE creator_payouts
         SET status = 'failed',
             notes = COALESCE($1, notes),
             updated_at = now()
         WHERE id = $2`,
        [disbursementResponse.error || 'Disbursement failed', payoutId]
      );

      // Mark associated fees back to pending
      if (payout.fee_ids && payout.fee_ids.length > 0) {
        await pool.query(
          `UPDATE platform_fees
           SET payout_status = 'pending',
               payout_date = NULL,
               updated_at = now()
           WHERE id = ANY($1::uuid[])`,
          [payout.fee_ids]
        );
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
      parseFloat(payout.amount),
      payoutId,
      `Payout via ${payout.payment_method}`
    );

    // Get balance after payout
    const balanceAfter = await financialTracking.getUserBalance(payout.creator_id);
    const balanceAfterAmount = balanceAfter?.available_balance || 0;

    // Update payout status to paid
    await pool.query(
      `UPDATE creator_payouts
       SET status = 'paid',
           payment_reference = $1,
           notes = COALESCE($2, notes),
           transaction_id = $3,
           balance_before = $4,
           balance_after = $5,
           processed_at = now(),
           payout_date = now(),
           updated_at = now()
       WHERE id = $6`,
      [
        paymentReference,
        notes || null,
        transactionId,
        balanceBeforeAmount,
        balanceAfterAmount,
        payoutId,
      ]
    );

    // Mark associated fees as paid
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await pool.query(
        `UPDATE platform_fees
         SET payout_status = 'paid',
             payout_date = now(),
             updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [payout.fee_ids]
      );
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
    const payoutResult = await pool.query(
      'SELECT * FROM creator_payouts WHERE id = $1',
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (payout.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid payout' });
    }

    // Update payout status to cancelled
    await pool.query(
      `UPDATE creator_payouts
       SET status = 'cancelled',
           notes = COALESCE($1, notes),
           updated_at = now()
       WHERE id = $2`,
      [notes || null, payoutId]
    );

    // Mark associated fees back to pending
    if (payout.fee_ids && payout.fee_ids.length > 0) {
      await pool.query(
        `UPDATE platform_fees
         SET payout_status = 'pending',
             payout_date = NULL,
             updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [payout.fee_ids]
      );
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