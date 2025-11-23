import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import dotenv from 'dotenv';
import { platformFees } from '../services/platformFees.js';
import { financialTracking } from '../services/financialTracking.js';
import { notificationService } from '../services/notifications.js';

dotenv.config();

const router = express.Router();

// Initialize Click Pesa service
const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

/**
 * Create payment for an order
 */
router.post('/create', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId, customerPhone, customerEmail, customerName } = req.body;

    if (!orderId || !customerPhone) {
      return res.status(400).json({ error: 'Order ID and customer phone are required' });
    }

    // Get order details
    const orderResult = await pool.query(
      `SELECT o.*, u.email, p.display_name, p.phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN profiles p ON o.user_id = p.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is not in pending status' });
    }

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa')
       RETURNING *`,
      [orderId, req.userId, order.total_amount, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: parseFloat(order.total_amount),
      currency: 'TZS',
      orderId: orderId,
      customerPhone: customerPhone,
      customerEmail: customerEmail || order.email,
      customerName: customerName || order.display_name || 'Customer',
      description: `Payment for order #${orderId}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      // Update payment status to failed
      await pool.query(
        `UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [clickPesaResponse.error || 'Payment creation failed', payment.id]
      );

      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await pool.query(
      `UPDATE payments 
       SET payment_id = $1, transaction_id = $2, checkout_url = $3, status = 'initiated'
       WHERE id = $4`,
      [
        clickPesaResponse.paymentId,
        clickPesaResponse.transactionId,
        clickPesaResponse.checkoutUrl,
        payment.id,
      ]
    );

    // Update order status
    await pool.query(
      `UPDATE orders SET status = 'payment_pending' WHERE id = $1`,
      [orderId]
    );

    res.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl: clickPesaResponse.checkoutUrl,
      message: 'Payment created successfully',
    });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * Check payment status
 */
router.get('/:paymentId/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { paymentId } = req.params;

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND user_id = $2`,
      [paymentId, req.userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // If payment has Click Pesa payment ID, check status with Click Pesa
    if (payment.payment_id && payment.status === 'initiated') {
      const statusResponse = await clickPesa.checkPaymentStatus(payment.payment_id);

      if (statusResponse.success) {
        // Update payment status based on Click Pesa response
        let newStatus = payment.status;
        if (statusResponse.message?.toLowerCase().includes('success') || 
            statusResponse.message?.toLowerCase().includes('completed') ||
            statusResponse.message?.toLowerCase().includes('paid')) {
          newStatus = 'completed';
        } else if (statusResponse.message?.toLowerCase().includes('failed') ||
                   statusResponse.message?.toLowerCase().includes('cancelled')) {
          newStatus = 'failed';
        }

        if (newStatus !== payment.status) {
          await pool.query(
            `UPDATE payments SET status = $1, updated_at = now() WHERE id = $2`,
            [newStatus, payment.id]
          );

          // Update order status if payment completed
          if (newStatus === 'completed') {
            await pool.query(
              `UPDATE orders SET status = 'paid' WHERE id = $1`,
              [payment.order_id]
            );
          }

          payment.status = newStatus;
        }
      }
    }

    res.json(payment);
  } catch (error: any) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

/**
 * Webhook endpoint for Click Pesa payment notifications
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-clickpesa-signature'] as string;

    // Verify webhook signature if provided
    // clickPesa.verifyWebhookSignature(webhookData, signature);

    const { payment_id, order_id, status, transaction_id } = webhookData;

    if (!payment_id || !order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find payment by Click Pesa payment ID
    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE payment_id = $1`,
      [payment_id]
    );

    if (paymentResult.rows.length === 0) {
      console.error('Payment not found for webhook:', payment_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Map Click Pesa status to our status
    let newStatus = payment.status;
    if (status === 'success' || status === 'completed' || status === 'paid') {
      newStatus = 'completed';
    } else if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
      newStatus = 'failed';
    } else if (status === 'pending') {
      newStatus = 'pending';
    }

    // Update payment
    await pool.query(
      `UPDATE payments 
       SET status = $1, transaction_id = $2, updated_at = now()
       WHERE id = $3`,
      [newStatus, transaction_id || payment.transaction_id, payment.id]
    );

    // Handle different payment types
    const paymentType = payment.payment_type || 'order';
    const orderId = payment.order_id;

    if (newStatus === 'completed') {
      // Handle based on payment type
      if (orderId.startsWith('subscription_')) {
        // Platform subscription
        await pool.query(
          `UPDATE platform_subscriptions
           SET status = 'active', payment_status = 'paid', updated_at = now()
           WHERE user_id = $1 AND status = 'pending'`,
          [payment.user_id]
        );
      } else if (paymentType === 'booking') {
        // Service booking
        const bookingId = orderId;
        await pool.query(
          `UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'digital_product') {
        // Digital product purchase
        const match = orderId.match(/digital_product_([^_]+)_(.+)/);
        if (match) {
          const productId = match[1];
          const buyerId = match[2];
          // Generate download URL (expires in 7 days)
          const downloadUrl = `/api/digital-products/${productId}/download?token=${Buffer.from(`${buyerId}:${productId}:${Date.now()}`).toString('base64')}`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          await pool.query(
            `UPDATE digital_product_purchases
             SET payment_status = 'paid', download_url = $1, download_expires_at = $2
             WHERE product_id = $3 AND buyer_id = $4`,
            [downloadUrl, expiresAt, productId, buyerId]
          );
        }
      } else if (paymentType === 'tip') {
        // Tip
        const tipId = orderId.replace('tip_', '');
        await pool.query(
          `UPDATE tips SET payment_status = 'paid' WHERE id = $1`,
          [tipId]
        );
      } else if (paymentType === 'commission') {
        // Commission payment
        const commissionId = orderId.replace('commission_', '');
        await pool.query(
          `UPDATE commissions SET payment_status = 'paid' WHERE id = $1`,
          [commissionId]
        );
      } else if (paymentType === 'performance_booking') {
        // Performance booking
        const bookingId = orderId.replace('performance_booking_', '');
        await pool.query(
          `UPDATE performance_bookings SET payment_status = 'paid', status = 'confirmed', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'featured_listing') {
        // Featured listing
        const listingId = orderId.replace('featured_', '');
        await pool.query(
          `UPDATE featured_listings SET status = 'active', payment_status = 'paid', updated_at = now() WHERE id = $1`,
          [listingId]
        );
      } else if (paymentType === 'lodging_booking') {
        // Lodging booking
        const bookingId = orderId.replace('lodging_booking_', '');
        await pool.query(
          `UPDATE lodging_bookings SET status = 'confirmed', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'restaurant_order') {
        // Restaurant order (uses orders table)
        await pool.query(
          `UPDATE orders SET status = 'paid' WHERE id = $1`,
          [orderId]
        );
      } else {
        // Default: regular order
        await pool.query(
          `UPDATE orders SET status = 'paid' WHERE id = $1`,
          [orderId]
        );
      }

      // Mark platform fees as collected and record earnings
      const feesResult = await pool.query(
        `UPDATE platform_fees 
         SET status = 'collected', updated_at = now()
         WHERE transaction_id = $1 AND status = 'pending'
         RETURNING user_id, creator_payout, transaction_type, transaction_id`,
        [orderId]
      );

      // Record earnings for creators
      for (const fee of feesResult.rows) {
        if (fee.creator_payout > 0) {
          await financialTracking.recordEarnings(
            fee.user_id,
            parseFloat(fee.creator_payout),
            fee.transaction_id,
            fee.transaction_type,
            `Earnings from ${fee.transaction_type}`,
            { transaction_id: fee.transaction_id }
          );

          // Notify creator about payment
          await notificationService.notifyPayment(
            fee.user_id,
            payment.id,
            'received',
            parseFloat(fee.creator_payout)
          );
        }
      }

      // Notify buyer about payment completion
      await notificationService.notifyPayment(
        payment.user_id,
        payment.id,
        'received',
        parseFloat(payment.amount)
      );
    } else if (newStatus === 'failed') {
      // Handle failures
      if (orderId.startsWith('subscription_')) {
        await pool.query(
          `UPDATE platform_subscriptions
           SET status = 'expired', payment_status = 'failed', updated_at = now()
           WHERE user_id = $1 AND status = 'pending'`,
          [payment.user_id]
        );
      } else if (paymentType === 'booking') {
        const bookingId = orderId;
        await pool.query(
          `UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'digital_product') {
        const match = orderId.match(/digital_product_([^_]+)_(.+)/);
        if (match) {
          const productId = match[1];
          const buyerId = match[2];
          await pool.query(
            `UPDATE digital_product_purchases SET payment_status = 'failed' WHERE product_id = $1 AND buyer_id = $2`,
            [productId, buyerId]
          );
        }
      } else if (paymentType === 'tip') {
        const tipId = orderId.replace('tip_', '');
        await pool.query(
          `UPDATE tips SET payment_status = 'failed' WHERE id = $1`,
          [tipId]
        );
      } else if (paymentType === 'commission') {
        const commissionId = orderId.replace('commission_', '');
        await pool.query(
          `UPDATE commissions SET payment_status = 'failed' WHERE id = $1`,
          [commissionId]
        );
      } else if (paymentType === 'performance_booking') {
        const bookingId = orderId.replace('performance_booking_', '');
        await pool.query(
          `UPDATE performance_bookings SET payment_status = 'failed', status = 'cancelled', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'featured_listing') {
        const listingId = orderId.replace('featured_', '');
        await pool.query(
          `UPDATE featured_listings SET status = 'cancelled', payment_status = 'failed', updated_at = now() WHERE id = $1`,
          [listingId]
        );
      } else if (paymentType === 'lodging_booking') {
        const bookingId = orderId.replace('lodging_booking_', '');
        await pool.query(
          `UPDATE lodging_bookings SET status = 'cancelled', updated_at = now() WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'restaurant_order') {
        await pool.query(
          `UPDATE orders SET status = 'payment_failed' WHERE id = $1`,
          [orderId]
        );
      } else {
        await pool.query(
          `UPDATE orders SET status = 'payment_failed' WHERE id = $1`,
          [orderId]
        );
      }

      // Mark platform fees as refunded/cancelled
      await pool.query(
        `UPDATE platform_fees 
         SET status = 'refunded', updated_at = now()
         WHERE transaction_id = $1 AND status = 'pending'`,
        [orderId]
      );
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get payment history for user
 */
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, o.total_amount, o.status as order_status
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

export default router;

