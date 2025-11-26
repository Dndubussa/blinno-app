/**
 * Financial Tracking Service
 * Handles all financial transactions, balance updates, and reporting
 */

import { supabase } from '../config/supabase.js';

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
      // Try to insert or update user balance
      const { data, error } = await supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid_out: 0,
          currency: 'TZS'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      // Return default balance if there's an error
      return {
        user_id: userId,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_paid_out: 0,
        currency: 'TZS'
      };
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, initialize user balance
          return await this.initializeUserBalance(userId);
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      // Return default balance if there's an error
      return {
        user_id: userId,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_paid_out: 0,
        currency: 'TZS'
      };
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

    // For Supabase, we'll need to handle the transaction recording differently
    // since we don't have the database function. We'll implement the logic directly.
    
    // Get current balance
    const balance = await this.getUserBalance(userId);
    if (!balance) {
      throw new Error('Failed to get user balance');
    }

    // Calculate new balance
    let balanceBefore = balance.available_balance;
    let balanceAfter = balanceBefore;
    
    if (transactionType === 'earnings') {
      balanceAfter = balanceBefore + amount;
    } else if (transactionType === 'payout') {
      balanceAfter = balanceBefore - amount;
    }

    // Insert transaction
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        amount: amount,
        currency: 'TZS',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: 'completed',
        reference_id: referenceId || null,
        reference_type: referenceType || null,
        description: description || null,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    // Update user balance
    if (transactionType === 'earnings') {
      await supabase
        .from('user_balances')
        .update({
          available_balance: balanceAfter,
          total_earned: balance.total_earned + amount,
          updated_at: new Date()
        })
        .eq('user_id', userId);
    } else if (transactionType === 'payout') {
      await supabase
        .from('user_balances')
        .update({
          available_balance: balanceAfter,
          total_paid_out: balance.total_paid_out + amount,
          updated_at: new Date()
        })
        .eq('user_id', userId);
    }

    return data.id;
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
    try {
      // Build query for transactions
      let query = supabase
        .from('financial_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.transactionType) {
        query = query.eq('transaction_type', options.transactionType);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.range(
          options.offset || 0, 
          (options.offset || 0) + options.limit - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        transactions: data as FinancialTransaction[],
        total: count || 0,
      };
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      return {
        transactions: [],
        total: 0,
      };
    }
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
      // Get balance
      const balance = await this.getUserBalance(userId);

      // Build query for earnings
      let earningsQuery = supabase
        .from('financial_transactions')
        .select('count(), sum:sum(amount)')
        .eq('user_id', userId)
        .eq('transaction_type', 'earnings');

      if (startDate && endDate) {
        earningsQuery = earningsQuery
          .gte('created_at', startDate)
          .lte('created_at', endDate);
      }

      const { data: earningsData, error: earningsError } = await earningsQuery;

      // Build query for payouts
      let payoutsQuery = supabase
        .from('financial_transactions')
        .select('count(), sum:sum(amount)')
        .eq('user_id', userId)
        .eq('transaction_type', 'payout');

      if (startDate && endDate) {
        payoutsQuery = payoutsQuery
          .gte('created_at', startDate)
          .lte('created_at', endDate);
      }

      const { data: payoutsData, error: payoutsError } = await payoutsQuery;

      // Build query for breakdown by type
      let breakdownQuery = supabase
        .from('financial_transactions')
        .select('transaction_type, count(), sum:sum(amount)')
        .eq('user_id', userId)
        .order('sum(amount)', { ascending: false });

      if (startDate && endDate) {
        breakdownQuery = breakdownQuery
          .gte('created_at', startDate)
          .lte('created_at', endDate);
      }

      const { data: breakdownData, error: breakdownError } = await breakdownQuery;

      return {
        balance: balance || {
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid_out: 0,
        },
        earnings: {
          count: earningsData?.[0]?.count ? parseInt(earningsData[0].count.toString()) : 0,
          total: earningsData?.[0]?.sum ? parseFloat(earningsData[0].sum.toString()) : 0,
        },
        payouts: {
          count: payoutsData?.[0]?.count ? parseInt(payoutsData[0].count.toString()) : 0,
          total: payoutsData?.[0]?.sum ? parseFloat(payoutsData[0].sum.toString()) : 0,
        },
        breakdown: breakdownData || [],
      };
    } catch (error: any) {
      console.error('Error getting financial summary:', error);
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
  }

  /**
   * Update pending balance (when payment is pending)
   */
  async updatePendingBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    await this.initializeUserBalance(userId);

    // Get current balance
    const balance = await this.getUserBalance(userId);
    if (!balance) return;

    if (operation === 'add') {
      await supabase
        .from('user_balances')
        .update({
          pending_balance: balance.pending_balance + amount,
          updated_at: new Date()
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_balances')
        .update({
          pending_balance: Math.max(0, balance.pending_balance - amount),
          updated_at: new Date()
        })
        .eq('user_id', userId);
    }
  }

  /**
   * Move from pending to available (when payment completes)
   */
  async movePendingToAvailable(userId: string, amount: number): Promise<void> {
    // Get current balance
    const balance = await this.getUserBalance(userId);
    if (!balance) return;

    await supabase
      .from('user_balances')
      .update({
        pending_balance: Math.max(0, balance.pending_balance - amount),
        available_balance: balance.available_balance + amount,
        updated_at: new Date()
      })
      .eq('user_id', userId);
  }
}

export const financialTracking = new FinancialTrackingService();