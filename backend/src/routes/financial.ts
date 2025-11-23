import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { financialTracking } from '../services/financialTracking.js';

const router = express.Router();

/**
 * Get user's financial summary
 */
router.get('/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const summary = await financialTracking.getFinancialSummary(
        req.userId,
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined
      );
      res.json(summary);
    } catch (dbError: any) {
      console.error('Database error in getFinancialSummary:', dbError);
      // Return empty summary if tables don't exist yet
      res.json({
        balance: { available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0 },
        earnings: { count: 0, total: 0 },
        payouts: { count: 0, total: 0 },
        breakdown: {}
      });
    }
  } catch (error: any) {
    console.error('Get financial summary error:', error);
    res.status(500).json({ error: 'Failed to get financial summary', details: error.message });
  }
});

/**
 * Get user's balance
 */
router.get('/balance', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const balance = await financialTracking.getUserBalance(req.userId);
      res.json(balance || { available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0, currency: 'TZS' });
    } catch (dbError: any) {
      console.error('Database error in getUserBalance:', dbError);
      // Return default balance if tables don't exist yet
      res.json({ available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0, currency: 'TZS' });
    }
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance', details: error.message });
  }
});

/**
 * Get transaction history
 */
router.get('/transactions', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      limit = 50,
      offset = 0,
      transactionType,
      startDate,
      endDate,
    } = req.query;

    try {
      const result = await financialTracking.getTransactionHistory(req.userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        transactionType: typeof transactionType === 'string' ? transactionType : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      });
      res.json(result);
    } catch (dbError: any) {
      console.error('Database error in getTransactionHistory:', dbError);
      // Return empty transactions if tables don't exist yet
      res.json({ transactions: [], total: 0 });
    }
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions', details: error.message });
  }
});

/**
 * Get financial report for a period
 */
router.get('/report', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let periodStart: string;
    let periodEnd: string;

    if (startDate && endDate) {
      periodStart = startDate as string;
      periodEnd = endDate as string;
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          periodEnd = now.toISOString();
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          periodEnd = now.toISOString();
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1).toISOString();
          periodEnd = now.toISOString();
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          periodEnd = now.toISOString();
      }
    }

    const summary = await financialTracking.getFinancialSummary(
      req.userId as string,
      periodStart,
      periodEnd
    );

    // Get daily breakdown
    const dailyResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total
       FROM financial_transactions
       WHERE user_id = $1 
         AND created_at >= $2 
         AND created_at <= $3
       GROUP BY DATE(created_at), transaction_type
       ORDER BY date DESC`,
      [req.userId, periodStart, periodEnd]
    );

    res.json({
      ...summary,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      dailyBreakdown: dailyResult.rows,
    });
  } catch (error: any) {
    console.error('Get financial report error:', error);
    res.status(500).json({ error: 'Failed to get financial report' });
  }
});

/**
 * Export transactions as CSV (for accounting)
 */
router.get('/transactions/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        created_at,
        transaction_type,
        amount,
        currency,
        balance_before,
        balance_after,
        status,
        description,
        reference_id,
        reference_type
      FROM financial_transactions
      WHERE user_id = $1
    `;
    const params: any[] = [req.userId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    // Convert to CSV
    const csvHeader = 'Date,Type,Amount,Currency,Balance Before,Balance After,Status,Description,Reference ID,Reference Type\n';
    const csvRows = result.rows.map((row) => {
      return [
        row.created_at,
        row.transaction_type,
        row.amount,
        row.currency,
        row.balance_before,
        row.balance_after,
        row.status,
        row.description || '',
        row.reference_id || '',
        row.reference_type || '',
      ].join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

export default router;

