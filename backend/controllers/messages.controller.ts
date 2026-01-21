import { Request, Response } from 'express';
import { pool } from '../config/database';
import { sendMessageToConversation, sendNotificationToUser } from '../services/websocket.service';

/**
 * Get all conversations for the current user
 * - Admin sees all conversations
 * - Customer sees only their conversations
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    let queryParams: any[] = [limitNum, offset];

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      // Customer only sees their conversations
      whereClause = 'WHERE c.user_id = $3';
      queryParams.push(userId);
    }

    const conversationsResult = await pool.query(
      `SELECT
        c.id,
        c.user_id as customer_id,
        c.order_id,
        c.product_id,
        c.status,
        c.last_message_at,
        c.created_at,
        c.updated_at,
        u.id as customer_id,
        u.full_name as customer_name,
        u.email as customer_email,
        u.avatar_url as customer_avatar,
        p.name as product_name,
        p.id as product_id,
        o.order_number,
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
         AND m.sender_id != $${queryParams.length + 1}
         AND m.is_read = false) as unread_count,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as total_messages
      FROM conversations c
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN orders o ON c.order_id = o.id
      ${whereClause}
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT $1 OFFSET $2`,
      [...queryParams, userId]
    );

    // Get last message for each conversation
    const conversations = await Promise.all(
      conversationsResult.rows.map(async (conv) => {
        const lastMessageResult = await pool.query(
          `SELECT m.*, u.id as sender_id, u.full_name as sender_name, u.avatar_url as sender_avatar
           FROM messages m
           INNER JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           ORDER BY m.created_at DESC
           LIMIT 1`,
          [conv.id]
        );

        return {
          id: conv.id,
          customerId: conv.customer_id,
          customerName: conv.customer_name,
          customerEmail: conv.customer_email,
          customerAvatar: conv.customer_avatar,
          orderId: conv.order_id,
          orderNumber: conv.order_number,
          productId: conv.product_id,
          productName: conv.product_name,
          status: conv.status,
          lastMessageAt: conv.last_message_at,
          lastMessage: lastMessageResult.rows[0] || null,
          unreadCount: parseInt(conv.unread_count),
          totalMessages: parseInt(conv.total_messages),
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
        };
      })
    );

    // Count total conversations
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM conversations c ${whereClause}`,
      whereClause ? [userId] : []
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting conversations',
      error: error.message,
    });
  }
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Verify conversation access
    const convResult = await pool.query(
      `SELECT user_id FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const conversation = convResult.rows[0];

    // Check if user has access
    if (
      conversation.user_id !== userId &&
      userRole !== 'admin' &&
      userRole !== 'super_admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation',
      });
    }

    // Get messages
    const messagesResult = await pool.query(
      `SELECT
        m.*,
        u.id as sender_id,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar,
        u.role as sender_role
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3`,
      [conversationId, limitNum, offset]
    );

    const messages = messagesResult.rows.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      isRead: msg.is_read,
      readAt: msg.read_at,
      attachmentUrl: msg.attachment_url,
      attachmentType: msg.attachment_type,
      attachmentName: msg.attachment_name,
      attachmentSize: msg.attachment_size,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      sender: {
        id: msg.sender_id,
        fullName: msg.sender_name,
        avatarUrl: msg.sender_avatar,
        role: msg.sender_role,
      },
    }));

    // Mark messages as read
    await pool.query(
      `UPDATE messages
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1
       AND sender_id != $2
       AND is_read = false`,
      [conversationId, userId]
    );

    // Count total messages
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM messages WHERE conversation_id = $1`,
      [conversationId]
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting messages',
      error: error.message,
    });
  }
};

/**
 * Send a message (also sent via WebSocket in real-time)
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and content are required',
      });
    }

    // Verify conversation access
    const convResult = await pool.query(
      `SELECT user_id FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const conversation = convResult.rows[0];

    // Check if user has access
    if (
      conversation.user_id !== userId &&
      userRole !== 'admin' &&
      userRole !== 'super_admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation',
      });
    }

    // Create message
    const messageResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [conversationId, userId, content.trim()]
    );

    const message = messageResult.rows[0];

    // Get sender info
    const userResult = await pool.query(
      `SELECT id, full_name, avatar_url, role FROM users WHERE id = $1`,
      [userId]
    );

    const messageWithSender = {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      content: message.content,
      isRead: message.is_read,
      readAt: message.read_at,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      sender: {
        id: userResult.rows[0].id,
        fullName: userResult.rows[0].full_name,
        avatarUrl: userResult.rows[0].avatar_url,
        role: userResult.rows[0].role,
      },
    };

    // Send via WebSocket
    sendMessageToConversation(conversationId, messageWithSender);

    // Send notification to other party
    if (userRole === 'admin' || userRole === 'super_admin') {
      sendNotificationToUser(conversation.user_id, {
        type: 'message-notification',
        conversationId,
        message: messageWithSender,
      });
    }

    res.status(201).json({
      success: true,
      data: { message: messageWithSender },
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message,
    });
  }
};

/**
 * Create or get existing conversation
 * - Customers can create conversations about products or orders
 */
export const createOrGetConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId, orderId, initialMessage } = req.body;

    if (!productId && !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Either productId or orderId is required',
      });
    }

    // Check if conversation already exists
    let existingConv;
    if (orderId) {
      const result = await pool.query(
        `SELECT * FROM conversations WHERE user_id = $1 AND order_id = $2 AND status = 'active'`,
        [userId, orderId]
      );
      existingConv = result.rows[0];
    } else if (productId) {
      const result = await pool.query(
        `SELECT * FROM conversations WHERE user_id = $1 AND product_id = $2 AND status = 'active'`,
        [userId, productId]
      );
      existingConv = result.rows[0];
    }

    if (existingConv) {
      // Return existing conversation
      return res.json({
        success: true,
        data: {
          conversation: existingConv,
          isNew: false,
        },
      });
    }

    // Create new conversation
    const convResult = await pool.query(
      `INSERT INTO conversations (user_id, product_id, order_id, status, created_at)
       VALUES ($1, $2, $3, 'active', NOW())
       RETURNING *`,
      [userId, productId || null, orderId || null]
    );

    const conversation = convResult.rows[0];

    // Send initial message if provided
    if (initialMessage) {
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [conversation.id, userId, initialMessage.trim()]
      );
    }

    res.status(201).json({
      success: true,
      data: {
        conversation,
        isNew: true,
      },
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message,
    });
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;

    await pool.query(
      `UPDATE messages
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1
       AND sender_id != $2
       AND is_read = false`,
      [conversationId, userId]
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message,
    });
  }
};

/**
 * Get unread messages count for current user
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    let result;
    if (userRole === 'admin' || userRole === 'super_admin') {
      // Admin sees all unread messages
      result = await pool.query(
        `SELECT COUNT(*) FROM messages m
         INNER JOIN conversations c ON m.conversation_id = c.id
         WHERE m.sender_id != $1 AND m.is_read = false`,
        [userId]
      );
    } else {
      // Customer sees only their unread messages
      result = await pool.query(
        `SELECT COUNT(*) FROM messages m
         INNER JOIN conversations c ON m.conversation_id = c.id
         WHERE c.user_id = $1 AND m.sender_id != $1 AND m.is_read = false`,
        [userId]
      );
    }

    const unreadCount = parseInt(result.rows[0].count);

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message,
    });
  }
};

/**
 * Edit a message
 * - Only the sender can edit their message
 * - Admin can edit any message
 */
export const editMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    // Get message
    const messageResult = await pool.query(
      `SELECT m.*, c.user_id
       FROM messages m
       INNER JOIN conversations c ON m.conversation_id = c.id
       WHERE m.id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const message = messageResult.rows[0];

    // Check if user has permission to edit
    const canEdit =
      message.sender_id === userId ||
      userRole === 'admin' ||
      userRole === 'super_admin';

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this message',
      });
    }

    // Update message
    const updateResult = await pool.query(
      `UPDATE messages
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), messageId]
    );

    const updatedMessage = updateResult.rows[0];

    // Get sender info
    const userResult = await pool.query(
      `SELECT id, full_name, avatar_url, role FROM users WHERE id = $1`,
      [updatedMessage.sender_id]
    );

    const messageWithSender = {
      id: updatedMessage.id,
      conversationId: updatedMessage.conversation_id,
      senderId: updatedMessage.sender_id,
      content: updatedMessage.content,
      isRead: updatedMessage.is_read,
      readAt: updatedMessage.read_at,
      createdAt: updatedMessage.created_at,
      updatedAt: updatedMessage.updated_at,
      sender: {
        id: userResult.rows[0].id,
        fullName: userResult.rows[0].full_name,
        avatarUrl: userResult.rows[0].avatar_url,
        role: userResult.rows[0].role,
      },
    };

    // Send via WebSocket
    sendMessageToConversation(updatedMessage.conversation_id, {
      ...messageWithSender,
      type: 'message-edited',
    });

    res.json({
      success: true,
      data: { message: messageWithSender },
    });
  } catch (error: any) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message',
      error: error.message,
    });
  }
};

/**
 * Delete a message
 * - Only the sender can delete their message
 * - Admin can delete any message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { messageId } = req.params;

    // Get message
    const messageResult = await pool.query(
      `SELECT m.*, c.user_id
       FROM messages m
       INNER JOIN conversations c ON m.conversation_id = c.id
       WHERE m.id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const message = messageResult.rows[0];

    // Check if user has permission to delete
    const canDelete =
      message.sender_id === userId ||
      userRole === 'admin' ||
      userRole === 'super_admin';

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message',
      });
    }

    // Delete message
    await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);

    // Send via WebSocket
    sendMessageToConversation(message.conversation_id, {
      type: 'message-deleted',
      messageId: messageId,
      conversationId: message.conversation_id,
    });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
};
