/**
 * Notification Service
 * Handles creating and sending notifications
 */

import { supabase } from '../config/supabase.js';
import { sendNotificationEmail, sendTemplatedEmail } from './emailService.js';

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
    // Insert notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const notificationId = notification.id;

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
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!preferences) {
      return; // No preferences, skip
    }

    const typePrefs = preferences.preferences || {};

    // Check if this notification type is enabled
    const typeEnabled = typePrefs[type] !== false; // Default to true unless explicitly disabled

    // Get user email and phone from Supabase Auth and profiles
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('user_id', userId)
      .single();

    if (!authUser?.user) return;

    const userEmail = authUser.user.email;
    const userPhone = profile?.phone;

    // Send email if enabled
    if (preferences.email_enabled && typeEnabled && userEmail) {
      await this.sendEmail(userId, notificationId, userEmail, title, message);
    }

    // Send SMS if enabled (requires SMS service integration)
    if (preferences.sms_enabled && typeEnabled && userPhone) {
      // TODO: Integrate with SMS service (e.g., Twilio, Click Pesa SMS)
      // await this.sendSMS(userId, notificationId, userPhone, message);
    }
  }

  /**
   * Send email notification using Resend
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
      const { error: logError } = await supabase
        .from('email_notifications')
        .insert({
          user_id: userId,
          notification_id: notificationId,
          email,
          subject,
          status: 'pending',
        });

      if (logError) {
        console.error('Failed to log email notification:', logError);
      }

      // Send email using Resend
      const result = await sendNotificationEmail(
        email,
        subject,
        message,
        `${process.env.APP_URL || 'https://www.blinno.app'}/notifications/${notificationId}`
      );

      // Update email notification status
      const status = result.success ? 'sent' : 'failed';
      await supabase
        .from('email_notifications')
        .update({
          status,
          error_message: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq('notification_id', notificationId)
        .eq('user_id', userId);

      if (result.success) {
        console.log(`Email sent successfully: ${email} - ${subject}`);
      } else {
        console.error(`Failed to send email: ${email} - ${subject}`, result.error);
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      
      // Update status to failed
      await supabase
        .from('email_notifications')
        .update({
          status: 'failed',
          error_message: error.message || 'Unknown error',
        })
        .eq('notification_id', notificationId)
        .eq('user_id', userId);
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
