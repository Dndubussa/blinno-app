/**
 * Client Service
 * Handles automatic client creation and management
 */

import { supabase } from '../config/supabase.js';

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
    const { data: existingClient, error: existingError } = await supabase
      .from('clients')
      .select('id')
      .eq('freelancer_id', freelancerId)
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingClient) {
      return existingClient.id;
    }

    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email, phone')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    // Create new client with user information
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        freelancer_id: freelancerId,
        user_id: userId,
        company_name: data.companyName || null,
        contact_name: data.contactName || profile?.display_name || null,
        email: data.email || profile?.email || authUser?.user?.email || null,
        phone: data.phone || profile?.phone || null,
        payment_terms: data.paymentTerms || null,
      })
      .select('id')
      .single();

    if (insertError) {
      // If unique constraint violation, fetch existing client
      if (insertError.code === '23505') {
        const { data: existingClient, error: fetchError } = await supabase
          .from('clients')
          .select('id')
          .eq('freelancer_id', freelancerId)
          .eq('user_id', userId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        return existingClient?.id || null;
      }
      throw insertError;
    }

    return newClient?.id || null;
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
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'freelancer');

    if (error) {
      throw error;
    }
    
    return data.length > 0;
  } catch (error) {
    console.error('Error checking freelancer role:', error);
    return false;
  }
}