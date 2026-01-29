import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { env } from '../config/env.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

let io: Server | null = null;

export const initializeWebSocket = (httpServer: HTTPServer) => {
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  const allowedOrigins = [
    ...corsOrigins,
    'https://www.melosportt.com',
    'https://melosportt.com',
    /^https:\/\/.*\.vercel\.app$/,
  ];

  console.log('Initializing WebSocket with CORS origins:', corsOrigins);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') {
            return origin === allowed;
          }
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          return false;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn('WebSocket CORS blocked origin:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      socket.userId = decoded.userId || decoded.id;
      socket.userRole = decoded.role;

      console.log(`WebSocket: User ${socket.userId} (${socket.userRole}) authenticated`);
      next();
    } catch (error: any) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;
    console.log(`WebSocket: User ${userId} (${userRole}) connected (${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Admin joins admin room to receive all messages
    if (userRole === 'admin' || userRole === 'super_admin') {
      socket.join('admin');
      console.log(`WebSocket: Admin ${userId} joined admin room`);
    }

    // Join conversation room
    socket.on('join-conversation', async (conversationId: string) => {
      try {
        console.log(`WebSocket: User ${userId} requesting to join conversation ${conversationId}`);

        // Verify user has access to conversation
        const result = await pool.query(
          `SELECT user_id as customer_id FROM conversations WHERE id = $1`,
          [conversationId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const conversation = result.rows[0];

        // Allow if user is customer or admin
        if (conversation.customer_id === userId || userRole === 'admin' || userRole === 'super_admin') {
          const room = `conversation:${conversationId}`;
          socket.join(room);

          const socketsInRoom = io?.sockets.adapter.rooms.get(room);
          console.log(`WebSocket: User ${userId} joined room ${room}. Total sockets: ${socketsInRoom ? socketsInRoom.size : 0}`);

          socket.emit('joined-conversation', { conversationId });
        } else {
          console.warn(`WebSocket: User ${userId} denied access to conversation ${conversationId}`);
          socket.emit('error', { message: 'Access denied to conversation' });
        }
      } catch (error: any) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Error joining conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Send message (real-time)
    socket.on('send-message', async (data: { conversationId: string; content: string }) => {
      try {
        const { conversationId, content } = data;

        // Verify conversation access
        const convResult = await pool.query(
          `SELECT user_id as customer_id FROM conversations WHERE id = $1`,
          [conversationId]
        );

        if (convResult.rows.length === 0) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const conversation = convResult.rows[0];

        // Only customer or admin can send messages
        if (conversation.customer_id !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message in database
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
          ...message,
          sender: userResult.rows[0],
        };

        // Emit to conversation room
        io?.to(`conversation:${conversationId}`).emit('new-message', messageWithSender);

        // Emit to admin room if sender is customer
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          io?.to('admin').emit('message-notification', {
            conversationId,
            message: messageWithSender,
          });
        }

        // Emit to customer's personal room if sender is admin
        if (userRole === 'admin' || userRole === 'super_admin') {
          io?.to(`user:${conversation.customer_id}`).emit('message-notification', {
            conversationId,
            message: messageWithSender,
          });
        }

        console.log(`Message sent in conversation ${conversationId} by user ${userId}`);
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId,
        isTyping: data.isTyping,
      });
    });

    // User presence
    socket.on('user-online', async () => {
      try {
        await pool.query(
          `UPDATE users SET updated_at = NOW() WHERE id = $1`,
          [userId]
        );

        io?.emit('user-status-change', {
          userId,
          status: 'online',
          lastSeen: new Date(),
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`WebSocket: User ${userId} disconnected (${socket.id})`);

      try {
        await pool.query(
          `UPDATE users SET updated_at = NOW() WHERE id = $1`,
          [userId]
        );

        io?.emit('user-status-change', {
          userId,
          status: 'offline',
          lastSeen: new Date(),
        });
      } catch (error) {
        console.error('Error updating user last seen:', error);
      }
    });
  });

  console.log('✅ WebSocket server initialized successfully');
  return io;
};

/**
 * Send notification to a specific user
 */
export const sendNotificationToUser = (userId: string, notification: any) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

/**
 * Send message to a conversation
 */
export const sendMessageToConversation = (conversationId: string, message: any) => {
  if (io) {
    const room = `conversation:${conversationId}`;
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    console.log(`WebSocket: Emitting 'new-message' to room ${room}`);
    console.log(`WebSocket: Sockets in room: ${socketsInRoom ? socketsInRoom.size : 0}`);
    io.to(room).emit('new-message', message);

    // Also notify admin room
    io.to('admin').emit('message-notification', {
      conversationId,
      message,
    });
  } else {
    console.warn('WebSocket: IO not initialized, cannot send message');
  }
};

/**
 * Broadcast to all users
 */
export const broadcastToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};

export const getIO = () => io;

export default {
  initializeWebSocket,
  sendNotificationToUser,
  sendMessageToConversation,
  broadcastToAll,
  getIO,
};
