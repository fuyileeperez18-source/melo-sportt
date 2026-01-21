import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  createOrGetConversation,
  markMessagesAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage,
} from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Send a message
router.post('/messages', sendMessage);

// Edit a message
router.put('/messages/:messageId', editMessage);

// Delete a message
router.delete('/messages/:messageId', deleteMessage);

// Create or get existing conversation
router.post('/conversations', createOrGetConversation);

// Mark messages as read
router.put('/conversations/:conversationId/read', markMessagesAsRead);

// Get unread messages count
router.get('/unread-count', getUnreadCount);

export default router;
