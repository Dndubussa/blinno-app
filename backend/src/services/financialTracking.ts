/**
 * Financial Tracking Service
 * Handles all financial transactions, balance updates, and reporting
 */

import { pool } from '../config/database.js';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  status: string;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  metadata?: any;
  created_at: Date;
}

export interface UserBalance {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid_out: number;
  currency: string;
}

class FinancialTrackingService {
  /**
   * Initialize or get user balance
   */
  async initializeUserBalance(userId: string): Promise<UserBalance> {
    try {
      const result = await pool.query(
        `INSERT INTO user_balances (user_id, available_balance, pending_balance, total_earned, total_paid_out, currency)
         VALUES ($1, 0, 0, 0, 0, 'TZS')
         ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
         RETURNING *`,
        [userId]
      );

      return result.rows[0];
    } catch (error: any) {
      // If table doesn't exist, return default balance
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          user_id: userId,
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid_out: 0,
          currency: 'TZS'
        };
      }
      throw error;
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_balances WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return await this.initializeUserBalance(userId);
      }

      return result.rows[0];
    } catch (error: any) {
      // If table doesn't exist, return default balance
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          user_id: userId,
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid_out: 0,
          currency: 'TZS'
        };
      }
      throw error;
    }
  }

  /**
   * Record a financial transaction and update balance
   */
  async recordTransaction(
    userId: string,
    transactionType: string,
    amount: number,
    referenceId?: string,
    referenceType?: string,
    description?: string,
    metadata?: any
  ): Promise<string> {
    // Ensure user balance exists
    await this.initializeUserBalance(userId);

    // Use the database function to record transaction and update balance
    const result = await pool.query(
      `SELECT record_financial_transaction(
        $1::uuid, $2::text, $3::numeric, $4::uuid, $5::text, $6::text, $7::jsonb
      ) as transaction_id`,
      [
        userId,
        transactionType,
        amount,
        referenceId || null,
        referenceType || null,
        description || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return result.rows[0].transaction_id;
  }

  /**
   * Record earnings (when payment is completed)
   */
  async recordEarnings(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    description?: string,
    metadata?: any
  ): Promise<string> {
    return this.recordTransaction(
      userId,
      'earnings',
      amount,
      referenceId,
      referenceType,
      description || `Earnings from ${referenceType}`,
      metadata
    );
  }

  /**
   * Record payout
   */
  async recordPayout(
    userId: string,
    amount: number,
    payoutId: string,
    description?: string
  ): Promise<string> {
    const transactionId = await this.recordTransaction(
      userId,
      'payout',
      amount,
      payoutId,
      'payout',
      description || 'Payout to creator',
      { payout_id: payoutId }
    );

    // Update total_paid_out
    await pool.query(
      `UPDATE user_balances
       SET total_paid_out = total_paid_out + $1,
           available_balance = available_balance - $1,
           updated_at = now()
       WHERE user_id = $2`,
      [amount, userId]
    );

    return transactionId;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ transactions: FinancialTransaction[]; total: number }> {
    let query = `
      SELECT * FROM financial_transactions
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramCount = 2;

    if (options?.transactionType) {
      query += ` AND transaction_type = $${paramCount++}`;
      params.push(options.transactionType);
    }

    if (options?.startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(options.startDate);
    }

    if (options?.endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(options.endDate);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get transactions with pagination
    query += ` ORDER BY created_at DESC`;
    if (options?.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);

    return {
      transactions: result.rows,
      total,
    };
  }

  /**
   * Get financial summary for a user
   */
  async getFinancialSummary(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      let dateFilter = '';
      const params: any[] = [userId];
      let paramCount = 2;

      if (startDate && endDate) {
        dateFilter = `AND created_at >= $${paramCount++} AND created_at <= $${paramCount++}`;
        params.push(startDate, endDate);
      }

      // Get balance
      const balance = await this.getUserBalance(userId);

      // Get earnings summary
      const earningsResult = await pool.query(
        `SELECT 
          COUNT(*) as count,
          SUM(amount) as total
         FROM financial_transactions
         WHERE user_id = $1 AND transaction_type = 'earnings' ${dateFilter}`,
        params
      );

      // Get payouts summary
      const payoutsResult = await pool.query(
        `SELECT 
          COUNT(*) as count,
          SUM(amount) as total
         FROM financial_transactions
         WHERE user_id = $1 AND transaction_type = 'payout' ${dateFilter}`,
        params
      );

    // Get breakdown by type
    const breakdownResult = await pool.query(
      `SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total
       FROM financial_transactions
       WHERE user_id = $1 ${dateFilter}
       GROUP BY transaction_type
       ORDER BY total DESC`,
      params
    );

      return {
        balance: balance || {
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid_out: 0,
        },
        earnings: {
          count: parseInt(earningsResult.rows[0]?.count || '0'),
          total: parseFloat(earningsResult.rows[0]?.total || '0'),
        },
        payouts: {
          count: parseInt(payoutsResult.rows[0]?.count || '0'),
          total: parseFloat(payoutsResult.rows[0]?.total || '0'),
        },
        breakdown: breakdownResult.rows || [],
      };
    } catch (error: any) {
      // If table doesn't exist, return default summary
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        const balance = await this.getUserBalance(userId);
        return {
          balance: balance || {
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_paid_out: 0,
          },
          earnings: { count: 0, total: 0 },
          payouts: { count: 0, total: 0 },
          breakdown: [],
        };
      }
      throw error;
    }
  }

  /**
   * Update pending balance (when payment is pending)
   */
  async updatePendingBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    await this.initializeUserBalance(userId);

    if (operation === 'add') {
      await pool.query(
        `UPDATE user_balances
         SET pending_balance = pending_balance + $1,
             updated_at = now()
         WHERE user_id = $2`,
        [amount, userId]
      );
    } else {
      await pool.query(
        `UPDATE user_balances
         SET pending_balance = GREATEST(0, pending_balance - $1),
             updated_at = now()
         WHERE user_id = $2`,
        [amount, userId]
      );
    }
  }

  /**
   * Move from pending to available (when payment completes)
   */
  async movePendingToAvailable(userId: string, amount: number): Promise<void> {
    await pool.query(
      `UPDATE user_balances
       SET pending_balance = GREATEST(0, pending_balance - $1),
           available_balance = available_balance + $1,
           updated_at = now()
       WHERE user_id = $2`,
      [amount, userId]
    );
  }
}

export const financialTracking = new FinancialTrackingService();

