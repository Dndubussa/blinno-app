import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import dotenv from 'dotenv';
import { platformFees } from '../services/platformFees.js';
import { financialTracking } from '../services/financialTracking.js';
import { notificationService } from '../services/notifications.js';
import { userPreferences } from '../services/userPreferences.js';

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
    
    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'TZS';

    if (!orderId || !customerPhone) {
      return res.status(400).json({ error: 'Order ID and customer phone are required' });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        user:profiles!orders_user_id_fkey(display_name, phone)
      `)
      .eq('id', orderId)
      .eq('user_id', req.userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is not in pending status' });
    }

    // Calculate fees based on user's currency
    const feeCalculation = platformFees.calculateMarketplaceFee(parseFloat(order.total_amount), undefined, currency);

    // Create payment record with currency support
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: currency,
      orderId: orderId,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || order.user?.display_name || 'Customer',
      description: `Payment for order #${orderId}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: clickPesaResponse.error || 'Payment creation failed',
        })
        .eq('id', payment.id);

      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await supabase
      .from('payments')
      .update({
        payment_id: clickPesaResponse.paymentId,
        transaction_id: clickPesaResponse.transactionId,
        checkout_url: clickPesaResponse.checkoutUrl,
        status: 'initiated',
      })
      .eq('id', payment.id);

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'payment_pending' })
      .eq('id', orderId);

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

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', req.userId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

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
          await supabase
            .from('payments')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          // Update order status if payment completed
          if (newStatus === 'completed') {
            await supabase
              .from('orders')
              .update({ status: 'paid' })
              .eq('id', payment.order_id);
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
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found for webhook:', payment_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

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
    await supabase
      .from('payments')
      .update({
        status: newStatus,
        transaction_id: transaction_id || payment.transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // Handle different payment types
    const paymentType = payment.payment_type || 'order';
    const orderId = payment.order_id;

    if (newStatus === 'completed') {
      // Handle based on payment type
      if (orderId.startsWith('subscription_')) {
        // Platform subscription
        await supabase
          .from('platform_subscriptions')
          .update({
            status: 'active',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payment.user_id)
          .eq('status', 'pending');
      } else if (paymentType === 'booking') {
        // Service booking
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
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
          
          await supabase
            .from('digital_product_purchases')
            .update({
              payment_status: 'paid',
              download_url: downloadUrl,
              download_expires_at: expiresAt.toISOString(),
            })
            .eq('product_id', productId)
            .eq('buyer_id', buyerId);
        }
      } else if (paymentType === 'tip') {
        // Tip
        const tipId = orderId.replace('tip_', '');
        await supabase
          .from('tips')
          .update({ payment_status: 'paid' })
          .eq('id', tipId);
      } else if (paymentType === 'commission') {
        // Commission payment
        const commissionId = orderId.replace('commission_', '');
        await supabase
          .from('commissions')
          .update({ payment_status: 'paid' })
          .eq('id', commissionId);
      } else if (paymentType === 'performance_booking') {
        // Performance booking
        const bookingId = orderId.replace('performance_booking_', '');
        await supabase
          .from('performance_bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
      } else if (paymentType === 'featured_listing') {
        // Featured listing
        const listingId = orderId.replace('featured_', '');
        await supabase
          .from('featured_listings')
          .update({
            status: 'active',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', listingId);
      } else if (paymentType === 'lodging_booking') {
        // Lodging booking
        const bookingId = orderId.replace('lodging_booking_', '');
        await supabase
          .from('lodging_bookings')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
      } else if (paymentType === 'restaurant_order') {
        // Restaurant order (uses orders table)
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', orderId);
      } else {
        // Default: regular order
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', orderId);
      }

      // Mark platform fees as collected and record earnings
      const { data: fees } = await supabase
        .from('platform_fees')
        .update({
          status: 'collected',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', orderId)
        .eq('status', 'pending')
        .select('user_id, creator_payout, transaction_type, transaction_id');

      // Record earnings for creators
      if (fees) {
        for (const fee of fees) {
          if (fee.creator_payout > 0) {
            await financialTracking.recordEarnings(
              fee.user_id,
              parseFloat(fee.creator_payout.toString()),
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
              parseFloat(fee.creator_payout.toString())
            );
          }
        }
      }

      // Notify buyer about payment completion
      await notificationService.notifyPayment(
        payment.user_id,
        payment.id,
        'received',
        parseFloat(payment.amount.toString())
      );
    } else if (newStatus === 'failed') {
      // Handle failures
      if (orderId.startsWith('subscription_')) {
        await supabase
          .from('platform_subscriptions')
          .update({
            status: 'expired',
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payment.user_id)
          .eq('status', 'pending');
      } else if (paymentType === 'booking') {
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      } else if (paymentType === 'digital_product') {
        const match = orderId.match(/digital_product_([^_]+)_(.+)/);
        if (match) {
          const productId = match[1];
          const buyerId = match[2];
          await supabase
            .from('digital_product_purchases')
            .update({ payment_status: 'failed' })
            .eq('product_id', productId)
            .eq('buyer_id', buyerId);
        }
      } else if (paymentType === 'tip') {
        const tipId = orderId.replace('tip_', '');
        await supabase
          .from('tips')
          .update({ payment_status: 'failed' })
          .eq('id', tipId);
      } else if (paymentType === 'commission') {
        const commissionId = orderId.replace('commission_', '');
        await supabase
          .from('commissions')
          .update({ payment_status: 'failed' })
          .eq('id', commissionId);
      } else if (paymentType === 'performance_booking') {
        const bookingId = orderId.replace('performance_booking_', '');
        await supabase
          .from('performance_bookings')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
      } else if (paymentType === 'featured_listing') {
        const listingId = orderId.replace('featured_', '');
        await supabase
          .from('featured_listings')
          .update({
            status: 'cancelled',
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', listingId);
      } else if (paymentType === 'lodging_booking') {
        const bookingId = orderId.replace('lodging_booking_', '');
        await supabase
          .from('lodging_bookings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
      } else if (paymentType === 'restaurant_order') {
        await supabase
          .from('orders')
          .update({ status: 'payment_failed' })
          .eq('id', orderId);
      } else {
        await supabase
          .from('orders')
          .update({ status: 'payment_failed' })
          .eq('id', orderId);
      }

      // Mark platform fees as refunded/cancelled
      await supabase
        .from('platform_fees')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', orderId)
        .eq('status', 'pending');
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
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders!inner(total_amount, status)
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((p: any) => ({
      ...p,
      order_status: p.orders?.status,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

export default router;
