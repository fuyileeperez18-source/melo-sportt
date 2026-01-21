import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// Get user's conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversations = await chatService.getConversations(req.user!.id);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// Create new conversation
router.post('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { channel } = z.object({
      channel: z.enum(['website', 'whatsapp', 'instagram']).default('website'),
    }).parse(req.body);

    const conversation = await chatService.createConversation(req.user!.id, channel);
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Verify user owns the conversation or is admin
    const conversation = await chatService.getConversation(req.params.id);
    if (conversation.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const messages = await chatService.getMessages(req.params.id);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, message_type, metadata } = z.object({
      content: z.string().min(1),
      message_type: z.enum(['text', 'image', 'product', 'order', 'quick_reply']).default('text'),
      metadata: z.record(z.unknown()).optional(),
    }).parse(req.body);

    // Verify user owns the conversation or is admin
    const conversation = await chatService.getConversation(req.params.id);
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';

    if (conversation.user_id !== req.user!.id && !isAdmin) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const message = await chatService.sendMessage({
      conversation_id: req.params.id,
      sender_type: isAdmin ? 'agent' : 'user',
      sender_id: req.user!.id,
      content,
      message_type,
      metadata,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Mark conversation as read
router.post('/conversations/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await chatService.markAsRead(req.params.id);
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

// Get all conversations (Admin)
router.get('/admin/conversations', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await chatService.getConversations();
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// Update conversation status (Admin)
router.patch('/conversations/:id/status', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({
      status: z.enum(['active', 'resolved', 'pending']),
    }).parse(req.body);

    const conversation = await chatService.updateConversationStatus(req.params.id, status);
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

// Assign conversation (Admin)
router.patch('/conversations/:id/assign', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { agentId } = z.object({
      agentId: z.string().uuid(),
    }).parse(req.body);

    const conversation = await chatService.assignConversation(req.params.id, agentId);
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

export default router;
