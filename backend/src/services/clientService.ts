/**
 * Client Service
 * Handles automatic client creation and management
 */

import { pool } from '../config/database.js';

export interface CreateClientData {
  freelancerId: string;
  userId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
}

/**
 * Auto-create or get existing client for a freelancer
 * This is called when platform interactions occur (messages, proposals, bookings, etc.)
 */
export async function ensureClientExists(data: CreateClientData): Promise<string | null> {
  const { freelancerId, userId } = data;

  // If no userId provided, this is an external client - return null
  if (!userId) {
    return null;
  }

  try {
    // Check if client already exists
    const existingResult = await pool.query(
      'SELECT id FROM clients WHERE freelancer_id = $1 AND user_id = $2',
      [freelancerId, userId]
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Get user profile information
    const profileResult = await pool.query(
      `SELECT p.display_name, p.email, p.phone, u.email as user_email
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );

    const profile = profileResult.rows[0];

    // Create new client with user information
    // Try to insert, if it fails due to unique constraint, fetch existing
    try {
      const result = await pool.query(
        `INSERT INTO clients (freelancer_id, user_id, company_name, contact_name, email, phone, payment_terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          freelancerId,
          userId,
          data.companyName || null,
          data.contactName || profile?.display_name || null,
          data.email || profile?.email || profile?.user_email || null,
          data.phone || profile?.phone || null,
          data.paymentTerms || null,
        ]
      );
      return result.rows[0]?.id || null;
    } catch (error: any) {
      // If unique constraint violation, fetch existing client
      if (error.code === '23505') {
        const existingResult = await pool.query(
          'SELECT id FROM clients WHERE freelancer_id = $1 AND user_id = $2',
          [freelancerId, userId]
        );
        return existingResult.rows[0]?.id || null;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error ensuring client exists:', error);
    // Don't throw - return null to allow the main operation to continue
    return null;
  }
}

/**
 * Check if a user is a freelancer
 */
export async function isFreelancer(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'freelancer'`,
      [userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking freelancer role:', error);
    return false;
  }
}

