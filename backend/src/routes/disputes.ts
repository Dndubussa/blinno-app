import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

/**
 * Create a dispute
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      orderId,
      bookingId,
      paymentId,
      disputeType,
      respondentId,
      title,
      description,
    } = req.body;

    if (!disputeType || !respondentId || !title || !description) {
      return res.status(400).json({ 
        error: 'Dispute type, respondent ID, title, and description are required' 
      });
    }

    // Verify user has a relationship with respondent (order, booking, etc.)
    let hasRelationship = false;
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          order_items!inner(
            products!inner(creator_id)
          )
        `)
        .eq('id', orderId)
        .eq('user_id', req.userId)
        .single();
      hasRelationship = !!order;
    } else if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, user_id, creator_id')
        .eq('id', bookingId)
        .or(`user_id.eq.${req.userId},creator_id.eq.${req.userId}`)
        .single();
      hasRelationship = !!booking;
    } else if (paymentId) {
      const { data: payment } = await supabase
        .from('payments')
        .select('id, user_id')
        .eq('id', paymentId)
        .eq('user_id', req.userId)
        .single();
      hasRelationship = !!payment;
    }

    if (!hasRelationship) {
      return res.status(403).json({ 
        error: 'You can only create disputes for transactions you are involved in' 
      });
    }

    // Create dispute
    const { data, error } = await supabase
      .from('disputes')
      .insert({
        order_id: orderId || null,
        booking_id: bookingId || null,
        payment_id: paymentId || null,
        dispute_type: disputeType,
        initiator_id: req.userId,
        respondent_id: respondentId,
        title,
        description,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify respondent
    await notificationService.createNotification(
      respondentId,
      'dispute_opened',
      'Dispute Opened',
      `A dispute has been opened against you: ${title}`,
      { dispute_id: data.id, dispute_type: disputeType }
    );

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create dispute error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

/**
 * Get user's disputes
 */
router.get('/my-disputes', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;

    let query = supabase
      .from('disputes')
      .select(`
        *,
        initiator:profiles!disputes_initiator_id_fkey(display_name),
        respondent:profiles!disputes_respondent_id_fkey(display_name)
      `)
      .or(`initiator_id.eq.${req.userId},respondent_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    }
    if (type) {
      query = query.eq('dispute_type', type as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((d: any) => ({
      ...d,
      initiator_name: d.initiator?.display_name,
      respondent_name: d.respondent?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get my disputes error:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

/**
 * Get dispute details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        initiator:profiles!disputes_initiator_id_fkey(display_name),
        respondent:profiles!disputes_respondent_id_fkey(display_name)
      `)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Check authorization
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;
    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (!isAdmin && !isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get evidence
    const { data: evidence } = await supabase
      .from('dispute_evidence')
      .select(`
        *,
        uploaded_by:profiles!dispute_evidence_uploaded_by_fkey(display_name)
      `)
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    // Get messages
    let messagesQuery = supabase
      .from('dispute_messages')
      .select(`
        *,
        sender:profiles!dispute_messages_sender_id_fkey(display_name)
      `)
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (!isAdmin) {
      messagesQuery = messagesQuery.eq('is_internal', false);
    }

    const { data: messages } = await messagesQuery;

    // Transform
    const transformedDispute = {
      ...dispute,
      initiator_name: dispute.initiator?.display_name,
      respondent_name: dispute.respondent?.display_name,
    };

    const transformedEvidence = (evidence || []).map((de: any) => ({
      ...de,
      uploaded_by_name: de.uploaded_by?.display_name,
    }));

    const transformedMessages = (messages || []).map((dm: any) => ({
      ...dm,
      sender_name: dm.sender?.display_name,
    }));

    res.json({
      ...transformedDispute,
      evidence: transformedEvidence,
      messages: transformedMessages,
    });
  } catch (error: any) {
    console.error('Get dispute error:', error);
    res.status(500).json({ error: 'Failed to get dispute' });
  }
});

/**
 * Add evidence to dispute
 */
router.post('/:id/evidence', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { fileUrl, fileType, description } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }

    // Get dispute and check authorization
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (!isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add evidence
    const { data, error } = await supabase
      .from('dispute_evidence')
      .insert({
        dispute_id: id,
        uploaded_by: req.userId,
        file_url: fileUrl,
        file_type: fileType || null,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Add evidence error:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

/**
 * Add message to dispute
 */
router.post('/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get dispute and check authorization
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Check if user is admin (for internal messages)
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', 'admin')
      .single();
    const isAdmin = !!roleCheck;
    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (isInternal && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can post internal messages' });
    }

    if (!isAdmin && !isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add message
    const { data, error } = await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: id,
        sender_id: req.userId,
        message,
        is_internal: isInternal || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify other party (if not internal)
    if (!isInternal) {
      const otherPartyId = dispute.initiator_id === req.userId 
        ? dispute.respondent_id 
        : dispute.initiator_id;
      
      await notificationService.createNotification(
        otherPartyId,
        'dispute_message',
        'New Dispute Message',
        `A new message has been added to dispute #${id}`,
        { dispute_id: id }
      );
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * Resolve dispute (admin only)
 */
router.post('/:id/resolve', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution is required' });
    }

    // Get dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return res.status(400).json({ error: 'Dispute is already resolved or closed' });
    }

    // Update dispute
    await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        resolved_by: req.userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Notify both parties
    await notificationService.createNotification(
      dispute.initiator_id,
      'dispute_resolved',
      'Dispute Resolved',
      `Dispute #${id} has been resolved: ${resolution}`,
      { dispute_id: id }
    );

    await notificationService.createNotification(
      dispute.respondent_id,
      'dispute_resolved',
      'Dispute Resolved',
      `Dispute #${id} has been resolved: ${resolution}`,
      { dispute_id: id }
    );

    res.json({ message: 'Dispute resolved successfully' });
  } catch (error: any) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

/**
 * Get all disputes (admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;

    let query = supabase
      .from('disputes')
      .select(`
        *,
        initiator:profiles!disputes_initiator_id_fkey(display_name),
        respondent:profiles!disputes_respondent_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    }
    if (type) {
      query = query.eq('dispute_type', type as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((d: any) => ({
      ...d,
      initiator_name: d.initiator?.display_name,
      respondent_name: d.respondent?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

export default router;
