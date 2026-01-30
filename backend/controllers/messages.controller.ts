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
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const dateFrom = (req.query.dateFrom as string) || '';
    const dateTo = (req.query.dateTo as string) || '';
    const unreadOnly = (req.query.unreadOnly as string) === 'true';
    const sortByField = (req.query.sortBy as string)?.split('-')[0] || 'last_message_at';
    const sortByDirection = (req.query.sortBy as string)?.split('-')[1] || 'desc';
    const sortBy = `${sortByField} ${sortByDirection.toUpperCase()}`;

    const pageNum = parseInt((req.query.page || '1') as string);
    const limitNum = parseInt((req.query.limit || '50') as string);
    const offset = (pageNum - 1) * limitNum;

    let whereConditions: string[] = [];
    let queryParams: (string | number)[] = [limitNum, offset];
    let paramIndex = 3; // After limit, offset

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereConditions.push('c.user_id = $' + paramIndex);
      queryParams.push(userId);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex+1} OR COALESCE(o.order_number, '') ILIKE $${paramIndex+2})`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }

    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Exclude support requests for admin in regular messages view
    if (userRole === 'admin' || userRole === 'super_admin') {
      whereConditions.push(`(c.is_support_request IS NULL OR c.is_support_request = false)`);
    }

    if (dateFrom) {
      whereConditions.push(`c.last_message_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`c.last_message_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    let whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    let havingClause = '';
    if (unreadOnly) {
      havingClause = 'HAVING unread_count > 0';
    }

    const userIdForSubqueryParamIndex = paramIndex;
    queryParams.push(userId);
    paramIndex++;

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
        c.is_support_request,
        c.problem_type,
        c.problem_label,
        c.priority,
        u.id as customer_id,
        u.full_name as customer_name,
        u.email as customer_email,
        u.avatar_url as customer_avatar,
        p.name as product_name,
        p.id as product_id,
        o.order_number,
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
         AND m.sender_id != $${userIdForSubqueryParamIndex}
         AND m.is_read = false) as unread_count,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as total_messages,
        lm_id, lm_conversation_id, lm_sender_id, lm_content, lm_is_read, lm_read_at, lm_attachment_url, lm_attachment_type, lm_attachment_name, lm_attachment_size, lm_created_at, lm_updated_at, lm_sender_name, lm_sender_avatar
      FROM conversations c
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN orders o ON c.order_id = o.id
      LEFT JOIN LATERAL (
        SELECT
          m.id as lm_id,
          m.conversation_id as lm_conversation_id,
          m.sender_id as lm_sender_id,
          m.content as lm_content,
          m.is_read as lm_is_read,
          m.read_at as lm_read_at,
          m.attachment_url as lm_attachment_url,
          m.attachment_type as lm_attachment_type,
          m.attachment_name as lm_attachment_name,
          m.attachment_size as lm_attachment_size,
          m.created_at as lm_created_at,
          m.updated_at as lm_updated_at,
          u2.full_name as lm_sender_name,
          u2.avatar_url as lm_sender_avatar
        FROM messages m
        INNER JOIN users u2 ON m.sender_id = u2.id
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true
      ${whereClause}
      ${havingClause}
      ORDER BY ${sortBy.replace('-', ' ')} NULLS LAST
      LIMIT $1 OFFSET $2`,
      queryParams
    );

    const conversations = conversationsResult.rows.map((conv) => ({
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
      lastMessage: conv.lm_id ? {
        id: conv.lm_id,
        conversation_id: conv.lm_conversation_id,
        sender_id: conv.lm_sender_id,
        content: conv.lm_content,
        is_read: conv.lm_is_read,
        read_at: conv.lm_read_at,
        attachment_url: conv.lm_attachment_url,
        attachment_type: conv.lm_attachment_type,
        attachment_name: conv.lm_attachment_name,
        attachment_size: conv.lm_attachment_size,
        created_at: conv.lm_created_at,
        updated_at: conv.lm_updated_at,
        sender_name: conv.lm_sender_name,
        sender_avatar: conv.lm_sender_avatar,
      } : null,
      unreadCount: parseInt(conv.unread_count || '0'),
      totalMessages: parseInt(conv.total_messages || '0'),
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      isSupportRequest: conv.is_support_request,
      problemType: conv.problem_type,
      problemLabel: conv.problem_label,
      priority: conv.priority,
    }));

    // Count total conversations - mirror WHERE and HAVING
    let countWhereConditions: string[] = [];
    let countParams: any[] = [];
    let countParamIndex = 1;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      countWhereConditions.push('c.user_id = $' + countParamIndex);
      countParams.push(userId);
      countParamIndex++;
    }

    if (search) {
      countWhereConditions.push(`(u.full_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex+1} OR COALESCE(o.order_number, '') ILIKE $${countParamIndex+2})`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParamIndex += 3;
    }

    if (status) {
      countWhereConditions.push(`c.status = $${countParamIndex}`);
      countParams.push(status);
      countParamIndex++;
    }

    if (dateFrom) {
      countWhereConditions.push(`c.last_message_at >= $${countParamIndex}`);
      countParams.push(dateFrom);
      countParamIndex++;
    }

    if (dateTo) {
      countWhereConditions.push(`c.last_message_at <= $${countParamIndex}`);
      countParams.push(dateTo);
      countParamIndex++;
    }

    let countWhereClause = countWhereConditions.length > 0 ? 'WHERE ' + countWhereConditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) FROM conversations c INNER JOIN users u ON c.user_id = u.id LEFT JOIN orders o ON c.order_id = o.id ${countWhereClause}`;
    if (unreadOnly) {
      // Special count for unread only
      const unreadCountQuery = `
        SELECT COUNT(*)
        FROM (
          SELECT 1 FROM conversations c
          INNER JOIN users u ON c.user_id = u.id
          LEFT JOIN orders o ON c.order_id = o.id
          INNER JOIN LATERAL (
            SELECT 1 FROM messages m
            WHERE m.conversation_id = c.id
            AND m.sender_id != $${countParams.length + 1}
            AND m.is_read = false
            LIMIT 1
          ) unread ON true
          ${countWhereClause}
        ) sub`;
      countParams.push(userId);
      const unreadResult = await pool.query(unreadCountQuery, countParams);
      const totalCount = parseInt(unreadResult.rows[0].count);
    } else {
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
    }

    const countResult = await pool.query(countQuery, countParams);

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

    // Validate conversationId
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt((req.query.page || '1') as string);
    const limitNum = parseInt((req.query.limit || '50') as string);
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
 * - Also handles support requests from MELOBOT
 */
export const createOrGetConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId, orderId, initialMessage, metadata } = req.body;

    // Check if this is a support request from MELOBOT
    const isSupportRequest = metadata?.supportRequest === true;
    const problemType = metadata?.problemType || null;
    const problemLabel = metadata?.problemLabel || null;
    const problemDescription = metadata?.description || null;

    // For support requests, always create a new conversation
    if (isSupportRequest) {
      const convResult = await pool.query(
        `INSERT INTO conversations (
          user_id, product_id, order_id, status,
          is_support_request, problem_type, problem_label, problem_description,
          created_at
        )
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, NOW())
        RETURNING *`,
        [
          userId,
          productId || null,
          orderId || null,
          true,
          problemType,
          problemLabel,
          problemDescription
        ]
      );

      const conversation = convResult.rows[0];

      // Send initial message (summary for admin)
      if (initialMessage) {
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [conversation.id, userId, initialMessage.trim()]
        );
      }

      // Notify admins about new support request via WebSocket
      try {
        const adminsResult = await pool.query(
          `SELECT id FROM users WHERE role IN ('admin', 'super_admin')`
        );
        for (const admin of adminsResult.rows) {
          sendNotificationToUser(admin.id, {
            type: 'new-support-request',
            conversationId: conversation.id,
            problemType,
            problemLabel,
            problemDescription,
          });
        }
      } catch (notifyError) {
        console.error('Error notifying admins:', notifyError);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: conversation.id,
          customerId: conversation.user_id,
          status: conversation.status,
          isSupportRequest: true,
          problemType: conversation.problem_type,
          problemLabel: conversation.problem_label,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
        isNew: true,
      });
    }

    // Regular conversation flow (not a support request)
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
          id: existingConv.id,
          customerId: existingConv.user_id,
          status: existingConv.status,
          createdAt: existingConv.created_at,
          updatedAt: existingConv.updated_at,
        },
        isNew: false,
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
        id: conversation.id,
        customerId: conversation.user_id,
        status: conversation.status,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      isNew: true,
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

// ============================================
// SUPPORT REQUESTS ENDPOINTS
// ============================================

/**
 * Get all support requests (Admin only)
 * Returns pending and active support requests for the admin panel
 */
export const getSupportRequests = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    // Only admins can view support requests
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { status, problemType, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Use params array suitable for the list query (includes limit and offset at $1, $2)
    const params: any[] = [limitNum, offset];
    let paramIndex = 3;
    let whereConditions = ['c.is_support_request = true'];

    if (status && status !== 'all') {
      whereConditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    } else {
      whereConditions.push(`c.status IN ('pending', 'active')`);
    }

    if (problemType && problemType !== 'all') {
      whereConditions.push(`c.problem_type = $${paramIndex}`);
      params.push(problemType);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(
      `SELECT
        c.id,
        c.user_id as customer_id,
        c.problem_type,
        c.problem_label,
        c.problem_description,
        c.priority,
        c.status,
        c.assigned_admin_id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        c.resolved_at,
        u.full_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        u.avatar_url as customer_avatar,
        admin.full_name as assigned_admin_name,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false AND m.sender_id = c.user_id) as unread_count,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as total_messages
      FROM conversations c
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN users admin ON c.assigned_admin_id = admin.id
      WHERE ${whereClause}
      ORDER BY
        CASE c.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        c.created_at ASC
      LIMIT $1 OFFSET $2`,
      params
    );

    // Get total count - Pass ALL params to match indices ($3, etc)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM conversations c WHERE ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limitNum);

    const supportRequests = result.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      customerAvatar: row.customer_avatar,
      problemType: row.problem_type,
      problemLabel: row.problem_label,
      problemDescription: row.problem_description,
      priority: row.priority,
      status: row.status,
      assignedAdminId: row.assigned_admin_id,
      assignedAdminName: row.assigned_admin_name,
      unreadCount: parseInt(row.unread_count),
      totalMessages: parseInt(row.total_messages),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      resolvedAt: row.resolved_at,
    }));

    res.json({
      success: true,
      data: {
        supportRequests,
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
    console.error('Error getting support requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting support requests',
      error: error.message,
    });
  }
};

/**
 * Get support request stats (Admin only)
 */
export const getSupportRequestStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'pending') as total_pending,
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'active') as total_active,
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'resolved' AND resolved_at >= CURRENT_DATE) as total_resolved_today,
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true) as total_all
    `);

    // Get counts by problem type
    const byTypeResult = await pool.query(`
      SELECT problem_type, COUNT(*) as count
      FROM conversations
      WHERE is_support_request = true AND status IN ('pending', 'active')
      GROUP BY problem_type
    `);

    const byType: Record<string, number> = {};
    byTypeResult.rows.forEach(row => {
      byType[row.problem_type || 'unknown'] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        totalPending: parseInt(result.rows[0].total_pending),
        totalActive: parseInt(result.rows[0].total_active),
        totalResolvedToday: parseInt(result.rows[0].total_resolved_today),
        totalAll: parseInt(result.rows[0].total_all),
        byType,
      },
    });
  } catch (error: any) {
    console.error('Error getting support request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting support request stats',
      error: error.message,
    });
  }
};

/**
 * Assign support request to admin
 */
export const assignSupportRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { conversationId } = req.params;
    const { adminId } = req.body;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    // If no adminId provided, assign to current user
    const assignToId = adminId || userId;

    const result = await pool.query(
      `UPDATE conversations
       SET assigned_admin_id = $1, status = 'active', updated_at = NOW()
       WHERE id = $2 AND is_support_request = true
       RETURNING *`,
      [assignToId, conversationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found',
      });
    }

    // Notify the customer that an admin has taken their request
    const conversation = result.rows[0];
    sendNotificationToUser(conversation.user_id, {
      type: 'support-request-assigned',
      conversationId: conversation.id,
      message: 'Un agente ha tomado tu solicitud y te responderá pronto.',
    });

    res.json({
      success: true,
      message: 'Support request assigned successfully',
      data: { conversation: result.rows[0] },
    });
  } catch (error: any) {
    console.error('Error assigning support request:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning support request',
      error: error.message,
    });
  }
};

/**
 * Resolve support request
 */
export const resolveSupportRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { conversationId } = req.params;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await pool.query(
      `UPDATE conversations
       SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
       WHERE id = $2 AND is_support_request = true
       RETURNING *`,
      [userId, conversationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found',
      });
    }

    // Notify the customer
    const conversation = result.rows[0];
    sendNotificationToUser(conversation.user_id, {
      type: 'support-request-resolved',
      conversationId: conversation.id,
      message: 'Tu solicitud de soporte ha sido resuelta.',
    });

    res.json({
      success: true,
      message: 'Support request resolved successfully',
      data: { conversation: result.rows[0] },
    });
  } catch (error: any) {
    console.error('Error resolving support request:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving support request',
      error: error.message,
    });
  }
};

/**
 * Update support request priority
 */
export const updateSupportRequestPriority = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const { conversationId } = req.params;
    const { priority } = req.body;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be one of: low, normal, high, urgent',
      });
    }

    const result = await pool.query(
      `UPDATE conversations
       SET priority = $1, updated_at = NOW()
       WHERE id = $2 AND is_support_request = true
       RETURNING *`,
      [priority, conversationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found',
      });
    }

    res.json({
      success: true,
      message: 'Priority updated successfully',
      data: { conversation: result.rows[0] },
    });
  } catch (error: any) {
    console.error('Error updating priority:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating priority',
      error: error.message,
    });
  }
};
