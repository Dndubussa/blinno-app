import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get all messages where user is sender or recipient
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(display_name, avatar_url),
        recipient:profiles!messages_recipient_id_fkey(display_name, avatar_url)
      `)
      .or(`sender_id.eq.${req.userId},recipient_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by conversation partner
    const conversationsMap = new Map();
    (messages || []).forEach((msg: any) => {
      const otherUserId = msg.sender_id === req.userId ? msg.recipient_id : msg.sender_id;
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          other_user_id: otherUserId,
          ...msg,
          display_name: msg.sender_id === req.userId ? msg.recipient?.display_name : msg.sender?.display_name,
          avatar_url: msg.sender_id === req.userId ? msg.recipient?.avatar_url : msg.sender?.avatar_url,
        });
      }
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages with a specific user
router.get('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(display_name, avatar_url),
        recipient:profiles!messages_recipient_id_fkey(display_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${req.userId},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${req.userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const result = (messages || []).map((msg: any) => ({
      ...msg,
      sender_name: msg.sender?.display_name,
      sender_avatar: msg.sender?.avatar_url,
      recipient_name: msg.recipient?.display_name,
      recipient_avatar: msg.recipient?.avatar_url,
    }));

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_id', req.userId)
      .eq('sender_id', userId)
      .eq('is_read', false);

    res.json(result);
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

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: req.userId,
        recipient_id: recipientId,
        content,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', req.userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    res.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
