import { Resend } from 'resend';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

/**
 * Resend Email Service
 * 
 * This service handles custom application emails via Resend API.
 * 
 * Note: If Resend is also configured as Supabase's SMTP provider (in Supabase dashboard),
 * Supabase Auth emails (password reset, email confirmation, etc.) will also be sent
 * through Resend, but via SMTP rather than this API.
 * 
 * See SUPABASE_RESEND_INTEGRATION.md for details on the dual integration.
 */

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn('RESEND_API_KEY not set. Email functionality will be disabled.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Email Address Configuration
 * Configure different sender addresses for different email types
 * All addresses must be verified in Resend (part of your verified domain)
 */
const EMAIL_ADDRESSES = {
  // Default/noreply emails
  default: process.env.RESEND_FROM_EMAIL || 'BLINNO <noreply@blinno.com>',
  noreply: process.env.RESEND_NOREPLY_EMAIL || 'BLINNO <noreply@blinno.com>',
  
  // Onboarding and welcome emails
  onboarding: process.env.RESEND_ONBOARDING_EMAIL || 'BLINNO <onboarding@blinno.com>',
  
  // Support and customer service
  support: process.env.RESEND_SUPPORT_EMAIL || 'BLINNO Support <support@blinno.com>',
  
  // Financial and payment emails
  finance: process.env.RESEND_FINANCE_EMAIL || 'BLINNO Finance <finance@blinno.com>',
  
  // Order and transaction emails
  orders: process.env.RESEND_ORDERS_EMAIL || 'BLINNO Orders <orders@blinno.com>',
  
  // Security and authentication
  security: process.env.RESEND_SECURITY_EMAIL || 'BLINNO Security <security@blinno.com>',
  
  // Marketing and newsletters
  marketing: process.env.RESEND_MARKETING_EMAIL || 'BLINNO <marketing@blinno.com>',
  
  // System and automated notifications
  system: process.env.RESEND_SYSTEM_EMAIL || 'BLINNO <system@blinno.com>',
} as const;

// Default fallback
const FROM_EMAIL = EMAIL_ADDRESSES.default;

/**
 * Get the appropriate sender email address based on email type
 */
export type EmailType = 
  | 'onboarding' 
  | 'support' 
  | 'finance' 
  | 'orders' 
  | 'security' 
  | 'marketing' 
  | 'system' 
  | 'default';

export function getSenderEmail(type?: EmailType): string {
  if (!type || type === 'default') {
    return EMAIL_ADDRESSES.default;
  }
  return EMAIL_ADDRESSES[type] || EMAIL_ADDRESSES.default;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  emailType?: EmailType; // Automatically select sender based on type
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    console.error('Resend not initialized. Set RESEND_API_KEY in environment variables.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Determine sender email: explicit from > emailType > default
    const senderEmail = options.from || getSenderEmail(options.emailType);
    
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send email using a template from the database
 */
export async function sendTemplatedEmail(
  templateName: string,
  to: string | string[],
  variables: Record<string, any> = {},
  options?: {
    from?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
    emailType?: EmailType; // Automatically select sender based on type
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', templateName)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error(`Email template not found: ${templateName}`);
      return { success: false, error: `Template "${templateName}" not found` };
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        bodyHtml = bodyHtml.replace(regex, String(value));
        if (bodyText) {
          bodyText = bodyText.replace(regex, String(value));
        }
      });
    }

    // Send email
    const result = await sendEmail({
      to,
      subject,
      html: bodyHtml,
      text: bodyText || undefined,
      from: options?.from,
      replyTo: options?.replyTo,
      tags: options?.tags,
      emailType: options?.emailType,
    });

    // Log email send
    if (result.success) {
      await logEmailSend(template.id, templateName, Array.isArray(to) ? to[0] : to, subject, 'sent', variables);
    } else {
      await logEmailSend(template.id, templateName, Array.isArray(to) ? to[0] : to, subject, 'failed', variables, result.error);
    }

    return result;
  } catch (error: any) {
    console.error('Send templated email error:', error);
    return { success: false, error: error.message || 'Failed to send templated email' };
  }
}

/**
 * Log email send to database
 */
async function logEmailSend(
  templateId: string | null,
  templateName: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' | 'bounced',
  variables?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('email_template_logs').insert({
      template_id: templateId,
      template_name: templateName,
      recipient_email: recipientEmail,
      subject,
      status,
      error_message: errorMessage || null,
      variables_used: variables ? JSON.stringify(variables) : null,
    });
  } catch (error) {
    console.error('Failed to log email send:', error);
    // Don't throw - logging failure shouldn't break email sending
  }
}

/**
 * Send welcome email to new user
 * Uses onboarding@blinno.com as sender
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail('welcome', userEmail, {
    userName,
    platformName: 'BLINNO',
    platformUrl: 'https://www.blinno.app',
  }, {
    emailType: 'onboarding',
    replyTo: EMAIL_ADDRESSES.support, // Users can reply to support
  });
}

/**
 * Send order confirmation email
 * Uses orders@blinno.com as sender, finance@blinno.com for reply-to
 */
export async function sendOrderConfirmationEmail(
  userEmail: string,
  orderId: string,
  orderTotal: number,
  orderItems: Array<{ name: string; quantity: number; price: number }>
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail('order_placed', userEmail, {
    orderId,
    orderTotal: orderTotal.toFixed(2),
    orderItems: orderItems.map(item => `${item.name} x${item.quantity}`).join(', '),
    orderUrl: `https://www.blinno.app/orders/${orderId}`,
  }, {
    emailType: 'orders',
    replyTo: EMAIL_ADDRESSES.finance, // Users can reply about orders to finance
  });
}

/**
 * Send password reset email
 * Uses security@blinno.com as sender
 */
export async function sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${process.env.APP_URL || 'https://www.blinno.app'}/auth/reset-password?token=${resetToken}`;
  return sendTemplatedEmail('password_reset', userEmail, {
    resetUrl,
    platformName: 'BLINNO',
  }, {
    emailType: 'security',
  });
}

/**
 * Send notification email
 * Uses support@blinno.com as sender by default
 * Falls back to plain email if template doesn't exist
 */
export async function sendNotificationEmail(
  userEmail: string,
  notificationTitle: string,
  notificationMessage: string,
  notificationUrl?: string,
  emailType: EmailType = 'support'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to use template first
    return await sendTemplatedEmail('notification', userEmail, {
      title: notificationTitle,
      message: notificationMessage,
      url: notificationUrl || 'https://www.blinno.app',
    }, {
      emailType,
      replyTo: EMAIL_ADDRESSES.support, // Users can reply to support
    });
  } catch (error) {
    // Fallback to plain email if template doesn't exist
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notificationTitle}</h2>
        <p>${notificationMessage}</p>
        ${notificationUrl ? `<p><a href="${notificationUrl}">View Details</a></p>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from BLINNO.</p>
      </div>
    `;
    
    return sendEmail({
      to: userEmail,
      subject: notificationTitle,
      html,
      text: `${notificationTitle}

${notificationMessage}${notificationUrl ? `

View Details: ${notificationUrl}` : ''}`,
      emailType,
      replyTo: EMAIL_ADDRESSES.support,
    });
  }
}

// EmailType is already exported above, no need to re-export

// Helper to get all email addresses (read-only)
export function getEmailAddresses() {
  return { ...EMAIL_ADDRESSES };
}

export default {
  sendEmail,
  sendTemplatedEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  getSenderEmail,
  getEmailAddresses,
};

