import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Conversation, ChatMessage } from '../types/index.js';

export const chatService = {
  async getConversations(userId?: string): Promise<Conversation[]> {
    let sql = `
      SELECT c.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as user,
        (SELECT row_to_json(cm)
         FROM chat_messages cm
         WHERE cm.conversation_id = c.id
         ORDER BY cm.created_at DESC
         LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
    `;

    const params: unknown[] = [];

    if (userId) {
      sql += ' WHERE c.user_id = $1';
      params.push(userId);
    }

    sql += ' ORDER BY c.updated_at DESC';

    const result = await query(sql, params);
    return result.rows as Conversation[];
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const result = await query(
      `SELECT c.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as user
       FROM conversations c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    return result.rows[0] as Conversation;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const result = await query(
      `SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows as ChatMessage[];
  },

  async createConversation(userId: string, channel: string = 'website'): Promise<Conversation> {
    const result = await query(
      `INSERT INTO conversations (user_id, channel, status)
       VALUES ($1, $2, 'active') RETURNING *`,
      [userId, channel]
    );
    return result.rows[0] as Conversation;
  },

  async sendMessage(message: Partial<ChatMessage>): Promise<ChatMessage> {
    const result = await query(
      `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, content, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        message.conversation_id,
        message.sender_type,
        message.sender_id,
        message.content,
        message.message_type || 'text',
        JSON.stringify(message.metadata || {}),
      ]
    );

    // Update conversation timestamp and unread count
    await query(
      `UPDATE conversations SET updated_at = NOW(),
       unread_count = CASE WHEN $2 = 'user' THEN unread_count + 1 ELSE 0 END
       WHERE id = $1`,
      [message.conversation_id, message.sender_type]
    );

    return result.rows[0] as ChatMessage;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await query(
      `UPDATE chat_messages SET is_read = true WHERE conversation_id = $1 AND is_read = false`,
      [conversationId]
    );
    await query(
      `UPDATE conversations SET unread_count = 0 WHERE id = $1`,
      [conversationId]
    );
  },

  async updateConversationStatus(conversationId: string, status: string): Promise<Conversation> {
    const result = await query(
      `UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, conversationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    return result.rows[0] as Conversation;
  },

  async assignConversation(conversationId: string, agentId: string): Promise<Conversation> {
    const result = await query(
      `UPDATE conversations SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [agentId, conversationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    return result.rows[0] as Conversation;
  },
};
