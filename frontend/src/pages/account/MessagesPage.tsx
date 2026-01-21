import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  User,
  Package,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/contexts/SocketContext';
import messageService, { type Conversation, type Message } from '@/services/message.service';

export function MessagesPage() {
  const { user } = useAuthStore();
  const { isConnected, joinConversation, leaveConversation, onNewMessage, onMessageEdited, onMessageDeleted, sendTyping } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar conversaciones al montar
  useEffect(() => {
    loadConversations();
  }, [user]);

  // Escuchar nuevos mensajes en tiempo real
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeNew = onNewMessage((message: Message) => {
      console.log('New message received:', message);

      // Actualizar mensajes si es de la conversación seleccionada
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          // Evitar duplicados
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Marcar como leído si no es mensaje propio
        if (message.senderId !== user?.id) {
          messageService.markMessagesAsRead(selectedConversation.id);
        }
      }

      // Actualizar lista de conversaciones
      loadConversations();
    });

    const unsubscribeEdited = onMessageEdited((message: Message) => {
      console.log('Message edited:', message);

      // Actualizar mensaje editado
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        );
      }
    });

    const unsubscribeDeleted = onMessageDeleted((data) => {
      console.log('Message deleted:', data);

      // Eliminar mensaje
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }

      // Actualizar lista de conversaciones
      loadConversations();
    });

    return () => {
      unsubscribeNew();
      unsubscribeEdited();
      unsubscribeDeleted();
    };
  }, [isConnected, selectedConversation, user, onNewMessage, onMessageEdited, onMessageDeleted]);

  // Join/leave conversation cuando se selecciona
  useEffect(() => {
    if (selectedConversation && isConnected) {
      joinConversation(selectedConversation.id);
      loadMessages(selectedConversation.id);

      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, isConnected]);

  // Auto-scroll al final de mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function loadConversations() {
    try {
      const response = await messageService.getConversations(1, 50);
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const response = await messageService.getMessages(conversationId, 1, 100);
      setMessages(response.data.messages);

      // Marcar como leído
      await messageService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      await messageService.sendMessage(selectedConversation.id, newMessage.trim());
      setNewMessage('');
      sendTyping(selectedConversation.id, false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setNewMessage(e.target.value);
    if (selectedConversation && isConnected) {
      sendTyping(selectedConversation.id, e.target.value.length > 0);
    }
  }

  function startEditing(message: Message) {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditContent('');
  }

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return;

    try {
      await messageService.editMessage(messageId, editContent.trim());
      cancelEditing();
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Error al editar el mensaje');
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

    try {
      await messageService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error al eliminar el mensaje');
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex h-screen">
        {/* Sidebar - Lista de conversaciones */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-zinc-800`}>
          {/* Header */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/account"
                className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Mis Mensajes</h1>
                <p className="text-sm text-zinc-500">
                  {isConnected ? (
                    <span className="text-green-400">● En línea</span>
                  ) : (
                    <span className="text-red-400">● Desconectado</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b border-zinc-800 hover:bg-zinc-900 transition-colors text-left ${
                    selectedConversation?.id === conv.id ? 'bg-zinc-900' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold truncate">
                          {conv.productName || conv.orderNumber || 'Conversación'}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-zinc-500">
                            {formatDate(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      {conv.productName && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                          <Package className="w-3 h-3" />
                          <span>Producto</span>
                        </div>
                      )}
                      {conv.orderNumber && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                          <ShoppingBag className="w-3 h-3" />
                          <span>Orden #{conv.orderNumber}</span>
                        </div>
                      )}
                      {conv.lastMessage && (
                        <p className="text-sm text-zinc-400 truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-lg font-semibold mb-2">No hay conversaciones</h3>
                <p className="text-zinc-500 text-sm">
                  Inicia una conversación desde un producto u orden
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Área de chat */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {selectedConversation ? (
            <>
              {/* Header del chat */}
              <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h2 className="font-bold">
                    {selectedConversation.productName || selectedConversation.orderNumber || 'Conversación'}
                  </h2>
                  {selectedConversation.productName && (
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Consulta sobre producto
                    </p>
                  )}
                  {selectedConversation.orderNumber && (
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Orden #{selectedConversation.orderNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  const isEditing = editingMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwnMessage && (
                          <span className="text-xs text-zinc-500 mb-1 px-2">
                            {message.sender.fullName}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-white text-black'
                              : 'bg-zinc-800 text-white'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditMessage(message.id)}
                                  className="p-1 bg-green-600 rounded hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1 bg-red-600 rounded hover:bg-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm">{message.content}</p>
                              {message.updatedAt && message.updatedAt !== message.createdAt && (
                                <p className="text-xs opacity-50 mt-1">(editado)</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-2">
                          <span className="text-xs text-zinc-500">
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwnMessage && !isEditing && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditing(message)}
                                className="p-1 hover:bg-zinc-800 rounded"
                                title="Editar"
                              >
                                <Edit2 className="w-3 h-3 text-zinc-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-1 hover:bg-zinc-800 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3 text-zinc-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    disabled={!isConnected || isSending}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isConnected || isSending}
                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-lg font-semibold mb-2">Selecciona una conversación</h3>
                <p className="text-zinc-500">
                  Elige una conversación de la lista para comenzar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
