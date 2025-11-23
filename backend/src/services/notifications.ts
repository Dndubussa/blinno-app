/**
 * Notification Service
 * Handles creating and sending notifications
 */

import { pool } from '../config/database.js';

export interface NotificationData {
  order_id?: string;
  booking_id?: string;
  payment_id?: string;
  message_id?: string;
  review_id?: string;
  payout_id?: string;
  refund_id?: string;
  dispute_id?: string;
  [key: string]: any;
}

class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<string> {
    const result = await pool.query(
      `SELECT create_notification($1::uuid, $2::text, $3::text, $4::text, $5::jsonb) as notification_id`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );

    const notificationId = result.rows[0].notification_id;

    // Check user preferences and send email/SMS if enabled
    await this.sendNotificationChannels(userId, notificationId, type, title, message);

    return notificationId;
  }

  /**
   * Send notification through enabled channels (email, SMS)
   */
  async sendNotificationChannels(
    userId: string,
    notificationId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    // Get user preferences
    const prefsResult = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    if (prefsResult.rows.length === 0) {
      return; // No preferences, skip
    }

    const preferences = prefsResult.rows[0];
    const typePrefs = preferences.preferences || {};

    // Check if this notification type is enabled
    const typeEnabled = typePrefs[type] !== false; // Default to true unless explicitly disabled

    // Get user email and phone
    const userResult = await pool.query(
      `SELECT u.email, p.phone FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];

    // Send email if enabled
    if (preferences.email_enabled && typeEnabled && user.email) {
      await this.sendEmail(userId, notificationId, user.email, title, message);
    }

    // Send SMS if enabled (requires SMS service integration)
    if (preferences.sms_enabled && typeEnabled && user.phone) {
      // TODO: Integrate with SMS service (e.g., Twilio, Click Pesa SMS)
      // await this.sendSMS(userId, notificationId, user.phone, message);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(
    userId: string,
    notificationId: string,
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    try {
      // Log email notification
      await pool.query(
        `INSERT INTO email_notifications (user_id, notification_id, email, subject, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [userId, notificationId, email, subject]
      );

      // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
      // For now, just log it
      console.log(`Email notification queued: ${email} - ${subject}`);

      // In production, you would:
      // 1. Use an email service (SendGrid, AWS SES, etc.)
      // 2. Update status to 'sent' or 'failed'
      // 3. Handle bounces and errors
    } catch (error) {
      console.error('Send email error:', error);
    }
  }

  /**
   * Notify user about order status change
   */
  async notifyOrderStatus(userId: string, orderId: string, status: string): Promise<void> {
    const statusMessages: { [key: string]: { title: string; message: string } } = {
      pending: {
        title: 'Order Placed',
        message: 'Your order has been placed and is being processed.',
      },
      confirmed: {
        title: 'Order Confirmed',
        message: 'Your order has been confirmed by the seller.',
      },
      shipped: {
        title: 'Order Shipped',
        message: 'Your order has been shipped and is on its way.',
      },
      delivered: {
        title: 'Order Delivered',
        message: 'Your order has been delivered. Please leave a review!',
      },
      cancelled: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled.',
      },
    };

    const notification = statusMessages[status];
    if (notification) {
      await this.createNotification(
        userId,
        `order_${status}`,
        notification.title,
        notification.message,
        { order_id: orderId }
      );
    }
  }

  /**
   * Notify user about payment
   */
  async notifyPayment(userId: string, paymentId: string, status: string, amount: number): Promise<void> {
    const messages: { [key: string]: { title: string; message: string } } = {
      received: {
        title: 'Payment Received',
        message: `Your payment of ${amount} TZS has been received successfully.`,
      },
      failed: {
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
      },
      refunded: {
        title: 'Payment Refunded',
        message: `A refund of ${amount} TZS has been processed.`,
      },
    };

    const notification = messages[status];
    if (notification) {
      await this.createNotification(
        userId,
        `payment_${status}`,
        notification.title,
        notification.message,
        { payment_id: paymentId, amount }
      );
    }
  }

  /**
   * Notify user about booking
   */
  async notifyBooking(userId: string, bookingId: string, status: string): Promise<void> {
    const messages: { [key: string]: { title: string; message: string } } = {
      requested: {
        title: 'Booking Requested',
        message: 'A new booking request has been received.',
      },
      confirmed: {
        title: 'Booking Confirmed',
        message: 'Your booking has been confirmed.',
      },
      cancelled: {
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled.',
      },
      completed: {
        title: 'Booking Completed',
        message: 'Your booking has been completed. Please leave a review!',
      },
    };

    const notification = messages[status];
    if (notification) {
      await this.createNotification(
        userId,
        `booking_${status}`,
        notification.title,
        notification.message,
        { booking_id: bookingId }
      );
    }
  }

  /**
   * Notify user about new message
   */
  async notifyMessage(userId: string, messageId: string, senderName: string): Promise<void> {
    await this.createNotification(
      userId,
      'message_received',
      'New Message',
      `You have a new message from ${senderName}`,
      { message_id: messageId }
    );
  }

  /**
   * Notify creator about new review
   */
  async notifyReview(creatorId: string, reviewId: string, rating: number, reviewerName: string): Promise<void> {
    await this.createNotification(
      creatorId,
      'review_received',
      'New Review',
      `${reviewerName} left you a ${rating}-star review`,
      { review_id: reviewId, rating }
    );
  }
}

export const notificationService = new NotificationService();

