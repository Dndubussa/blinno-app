import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END)
       CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_user_id,
       m.*,
       p.display_name, p.avatar_url
       FROM messages m
       JOIN profiles p ON p.user_id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = $1 OR m.recipient_id = $1
       ORDER BY CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END, m.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages with a specific user
router.get('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT m.*, 
       p1.display_name as sender_name, p1.avatar_url as sender_avatar,
       p2.display_name as recipient_name, p2.avatar_url as recipient_avatar
       FROM messages m
       JOIN profiles p1 ON m.sender_id = p1.user_id
       JOIN profiles p2 ON m.recipient_id = p2.user_id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at ASC`,
      [req.userId, userId]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false`,
      [req.userId, userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: 'Recipient ID and content are required' });
    }

    // Import client service
    const { ensureClientExists, isFreelancer } = await import('../services/clientService.js');

    // Auto-create client relationship if recipient is a freelancer
    const recipientIsFreelancer = await isFreelancer(recipientId);
    if (recipientIsFreelancer) {
      await ensureClientExists({
        freelancerId: recipientId,
        userId: req.userId,
      });
    }

    // Auto-create client relationship if sender is a freelancer
    const senderIsFreelancer = await isFreelancer(req.userId);
    if (senderIsFreelancer) {
      await ensureClientExists({
        freelancerId: req.userId,
        userId: recipientId,
      });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, recipientId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
      [req.userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;

