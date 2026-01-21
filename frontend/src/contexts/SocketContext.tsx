import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import type { Message } from '../services/message.service';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onMessageEdited: (callback: (message: Message) => void) => () => void;
  onMessageDeleted: (callback: (data: { messageId: string; conversationId: string }) => void) => () => void;
  onUserTyping: (callback: (data: { userId: string; isTyping: boolean }) => void) => () => void;
  onMessageNotification: (callback: (data: { conversationId: string; message: Message }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
  onNewMessage: () => () => {},
  onMessageEdited: () => () => {},
  onMessageDeleted: () => () => {},
  onUserTyping: () => () => {},
  onMessageNotification: () => () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const newMessageCallbacksRef = useRef<((message: Message) => void)[]>([]);
  const messageEditedCallbacksRef = useRef<((message: Message) => void)[]>([]);
  const messageDeletedCallbacksRef = useRef<((data: { messageId: string; conversationId: string }) => void)[]>([]);
  const userTypingCallbacksRef = useRef<((data: { userId: string; isTyping: boolean }) => void)[]>([]);
  const messageNotificationCallbacksRef = useRef<((data: { conversationId: string; message: Message }) => void)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('melo_sportt_token');

    if (!isAuthenticated || !token || !user) {
      // Disconnect if no token/session
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    // Note: Socket.IO is mounted at root level, not under /api
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const backendUrl = apiUrl.replace(/\/api\/?$/, ''); // Remove /api suffix if present

    console.log('Connecting to WebSocket:', backendUrl);

    const newSocket = io(backendUrl, {
      auth: {
        token,
      },
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 30000, // Longer timeout for cold starts on Render
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);

      // Emit user-online event
      newSocket.emit('user-online');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);

      // Si el backend rechaza el handshake por token inválido/expirado, forzar logout global.
      // Mantiene el estado de la app consistente con el servidor.
      if (error instanceof Error && error.message.includes('Authentication error')) {
        window.dispatchEvent(new CustomEvent('melo:unauthorized'));
      }
    });

    // Listen for new messages
    newSocket.on('new-message', (message: Message) => {
      console.log('Received new message:', message);
      newMessageCallbacksRef.current.forEach(callback => callback(message));
    });

    // Listen for message edited
    newSocket.on('message-edited', (message: Message) => {
      console.log('Message edited:', message);
      messageEditedCallbacksRef.current.forEach(callback => callback(message));
    });

    // Listen for message deleted
    newSocket.on('message-deleted', (data: { messageId: string; conversationId: string }) => {
      console.log('Message deleted:', data);
      messageDeletedCallbacksRef.current.forEach(callback => callback(data));
    });

    // Listen for typing events
    newSocket.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      console.log('User typing:', data);
      userTypingCallbacksRef.current.forEach(callback => callback(data));
    });

    // Listen for message notifications
    newSocket.on('message-notification', (data: { conversationId: string; message: Message }) => {
      console.log('Message notification:', data);
      messageNotificationCallbacksRef.current.forEach(callback => callback(data));
    });

    // Listen for errors
    newSocket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      console.log('Joining conversation:', conversationId);
      socket.emit('join-conversation', conversationId);
    }
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      console.log('Leaving conversation:', conversationId);
      socket.emit('leave-conversation', conversationId);
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (socket && isConnected) {
      console.log('Sending message:', { conversationId, content });
      socket.emit('send-message', { conversationId, content });
    }
  }, [socket, isConnected]);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('typing', { conversationId, isTyping });
    }
  }, [socket, isConnected]);

  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    newMessageCallbacksRef.current.push(callback);
    return () => {
      newMessageCallbacksRef.current = newMessageCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const onMessageEdited = useCallback((callback: (message: Message) => void) => {
    messageEditedCallbacksRef.current.push(callback);
    return () => {
      messageEditedCallbacksRef.current = messageEditedCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const onMessageDeleted = useCallback((callback: (data: { messageId: string; conversationId: string }) => void) => {
    messageDeletedCallbacksRef.current.push(callback);
    return () => {
      messageDeletedCallbacksRef.current = messageDeletedCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const onUserTyping = useCallback((callback: (data: { userId: string; isTyping: boolean }) => void) => {
    userTypingCallbacksRef.current.push(callback);
    return () => {
      userTypingCallbacksRef.current = userTypingCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const onMessageNotification = useCallback((callback: (data: { conversationId: string; message: Message }) => void) => {
    messageNotificationCallbacksRef.current.push(callback);
    return () => {
      messageNotificationCallbacksRef.current = messageNotificationCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onUserTyping,
    onMessageNotification,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export default SocketContext;
