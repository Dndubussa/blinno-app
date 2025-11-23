import express from 'express';
import { pool } from '../config/database.js';
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
      const orderResult = await pool.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND (user_id = $2 OR EXISTS (
           SELECT 1 FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1 AND p.creator_id = $2
         ))`,
        [orderId, req.userId]
      );
      hasRelationship = orderResult.rows.length > 0;
    } else if (bookingId) {
      const bookingResult = await pool.query(
        `SELECT * FROM bookings 
         WHERE id = $1 AND (user_id = $2 OR creator_id = $2)`,
        [bookingId, req.userId]
      );
      hasRelationship = bookingResult.rows.length > 0;
    } else if (paymentId) {
      const paymentResult = await pool.query(
        `SELECT * FROM payments WHERE id = $1 AND user_id = $2`,
        [paymentId, req.userId]
      );
      hasRelationship = paymentResult.rows.length > 0;
    }

    if (!hasRelationship) {
      return res.status(403).json({ 
        error: 'You can only create disputes for transactions you are involved in' 
      });
    }

    // Create dispute
    const result = await pool.query(
      `INSERT INTO disputes (
        order_id, booking_id, payment_id, dispute_type,
        initiator_id, respondent_id, title, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
      RETURNING *`,
      [
        orderId || null,
        bookingId || null,
        paymentId || null,
        disputeType,
        req.userId,
        respondentId,
        title,
        description,
      ]
    );

    const dispute = result.rows[0];

    // Notify respondent
    await notificationService.createNotification(
      respondentId,
      'dispute_opened',
      'Dispute Opened',
      `A dispute has been opened against you: ${title}`,
      { dispute_id: dispute.id, dispute_type: disputeType }
    );

    res.status(201).json(dispute);
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

    let query = `
      SELECT 
        d.*,
        p1.display_name as initiator_name,
        p2.display_name as respondent_name
      FROM disputes d
      JOIN profiles p1 ON d.initiator_id = p1.user_id
      JOIN profiles p2 ON d.respondent_id = p2.user_id
      WHERE (d.initiator_id = $1 OR d.respondent_id = $1)
    `;
    const params: any[] = [req.userId];
    let paramCount = 2;

    if (status) {
      query += ` AND d.status = $${paramCount++}`;
      params.push(status);
    }

    if (type) {
      query += ` AND d.dispute_type = $${paramCount++}`;
      params.push(type);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
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
    const disputeResult = await pool.query(
      `SELECT 
        d.*,
        p1.display_name as initiator_name,
        p2.display_name as respondent_name
       FROM disputes d
       JOIN profiles p1 ON d.initiator_id = p1.user_id
       JOIN profiles p2 ON d.respondent_id = p2.user_id
       WHERE d.id = $1`,
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    // Check authorization
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;
    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (!isAdmin && !isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get evidence
    const evidenceResult = await pool.query(
      `SELECT de.*, p.display_name as uploaded_by_name
       FROM dispute_evidence de
       JOIN profiles p ON de.uploaded_by = p.user_id
       WHERE de.dispute_id = $1
       ORDER BY de.created_at ASC`,
      [id]
    );

    // Get messages
    const messagesResult = await pool.query(
      `SELECT 
        dm.*,
        p.display_name as sender_name
       FROM dispute_messages dm
       JOIN profiles p ON dm.sender_id = p.user_id
       WHERE dm.dispute_id = $1 
         AND (dm.is_internal = false OR $2 = true)
       ORDER BY dm.created_at ASC`,
      [id, isAdmin]
    );

    res.json({
      ...dispute,
      evidence: evidenceResult.rows,
      messages: messagesResult.rows,
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
    const disputeResult = await pool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];
    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (!isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add evidence
    const result = await pool.query(
      `INSERT INTO dispute_evidence (dispute_id, uploaded_by, file_url, file_type, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.userId, fileUrl, fileType || null, description || null]
    );

    res.status(201).json(result.rows[0]);
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
    const disputeResult = await pool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    // Check if user is admin (for internal messages)
    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'`,
      [req.userId]
    );
    const isAdmin = roleResult.rows.length > 0;
    const isInvolved = dispute.initiator_id === req.userId || dispute.respondent_id === req.userId;

    if (isInternal && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can post internal messages' });
    }

    if (!isAdmin && !isInvolved) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add message
    const result = await pool.query(
      `INSERT INTO dispute_messages (dispute_id, sender_id, message, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.userId, message, isInternal || false]
    );

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

    res.status(201).json(result.rows[0]);
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
    const disputeResult = await pool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return res.status(400).json({ error: 'Dispute is already resolved or closed' });
    }

    // Update dispute
    await pool.query(
      `UPDATE disputes
       SET status = 'resolved',
           resolution = $1,
           resolved_by = $2,
           resolved_at = now(),
           updated_at = now()
       WHERE id = $3`,
      [resolution, req.userId, id]
    );

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

    let query = `
      SELECT 
        d.*,
        p1.display_name as initiator_name,
        p2.display_name as respondent_name
      FROM disputes d
      JOIN profiles p1 ON d.initiator_id = p1.user_id
      JOIN profiles p2 ON d.respondent_id = p2.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND d.status = $${paramCount++}`;
      params.push(status);
    }

    if (type) {
      query += ` AND d.dispute_type = $${paramCount++}`;
      params.push(type);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

export default router;

