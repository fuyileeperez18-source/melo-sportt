import { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  User,
  Package,
  ShoppingBag,
  Mail,
  Clock,
  Archive,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuthStore } from '@/stores/authStore';
import messageService, { type Conversation, type Message } from '@/services/message.service';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export function AdminMessages() {
  const { user } = useAuthStore();
  const { isConnected, joinConversation, leaveConversation, onNewMessage, onMessageEdited, onMessageDeleted, sendTyping } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar conversaciones
  useEffect(() => {
    loadConversations();
  }, []);

  // Escuchar nuevos mensajes en tiempo real
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeNew = onNewMessage((message: Message) => {
      console.log('New message received (admin):', message);

      // Actualizar mensajes si es de la conversación seleccionada
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        messageService.markMessagesAsRead(selectedConversation.id);
      }

      loadConversations();
    });

    const unsubscribeEdited = onMessageEdited((message: Message) => {
      console.log('Message edited (admin):', message);

      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        );
      }
    });

    const unsubscribeDeleted = onMessageDeleted((data) => {
      console.log('Message deleted (admin):', data);

      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }

      loadConversations();
    });

    return () => {
      unsubscribeNew();
      unsubscribeEdited();
      unsubscribeDeleted();
    };
  }, [isConnected, selectedConversation, onNewMessage, onMessageEdited, onMessageDeleted]);

  // Join/leave conversation
  useEffect(() => {
    if (selectedConversation && isConnected) {
      joinConversation(selectedConversation.id);
      loadMessages(selectedConversation.id);

      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, isConnected]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function loadConversations() {
    try {
      const response = await messageService.getConversations(1, 100);
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Error al cargar conversaciones');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const response = await messageService.getMessages(conversationId, 1, 100);
      setMessages(response.data.messages);
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
      toast.error('Error al enviar mensaje');
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
    if (!editContent.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    try {
      await messageService.editMessage(messageId, editContent.trim());
      cancelEditing();
      toast.success('Mensaje editado');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Error al editar el mensaje');
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

    try {
      await messageService.deleteMessage(messageId);
      toast.success('Mensaje eliminado');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Error al eliminar el mensaje');
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

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      conv.customerName.toLowerCase().includes(searchLower) ||
      conv.customerEmail.toLowerCase().includes(searchLower) ||
      conv.productName?.toLowerCase().includes(searchLower) ||
      conv.orderNumber?.toLowerCase().includes(searchLower);

    const matchesUnread = !filterUnread || conv.unreadCount > 0;

    return matchesSearch && matchesUnread;
  });

  // Calcular estadísticas
  const stats = {
    total: conversations.length,
    unread: conversations.filter(c => c.unreadCount > 0).length,
    withOrder: conversations.filter(c => c.orderId).length,
    withProduct: conversations.filter(c => c.productId && !c.orderId).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Mensajes de Clientes</h1>
          <p className="text-gray-600">
            {isConnected ? (
              <span className="text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En línea
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Desconectado
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats - Solo mostrar si hay conversaciones */}
      {conversations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={cn(
              'bg-white rounded-xl p-4 border shadow-sm transition-all text-left',
              filterUnread ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <p className="text-gray-600 text-sm font-medium">Total</p>
            </div>
            <p className="text-2xl font-bold text-black">{stats.total}</p>
          </button>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-gray-600 text-sm font-medium">Sin leer</p>
            </div>
            <p className="text-2xl font-bold text-black">{stats.unread}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="h-5 w-5 text-green-600" />
              <p className="text-gray-600 text-sm font-medium">Con orden</p>
            </div>
            <p className="text-2xl font-bold text-black">{stats.withOrder}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-5 w-5 text-purple-600" />
              <p className="text-gray-600 text-sm font-medium">Consultas</p>
            </div>
            <p className="text-2xl font-bold text-black">{stats.withProduct}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, email, producto u orden..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
          {stats.unread > 0 && (
            <Button
              variant={filterUnread ? 'primary' : 'outline'}
              onClick={() => setFilterUnread(!filterUnread)}
              leftIcon={<Inbox className="h-4 w-4" />}
            >
              {filterUnread ? 'Ver todos' : `Solo sin leer (${stats.unread})`}
            </Button>
          )}
        </div>
      </div>

      {/* Chat Layout o Empty State */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-black mb-3">No hay mensajes aún</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Cuando los clientes te envíen mensajes sobre productos o pedidos, aparecerán aquí.
            Por ahora, no hay conversaciones activas.
          </p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">No se encontraron conversaciones</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? `No hay resultados para "${searchQuery}"`
              : filterUnread
                ? 'No hay mensajes sin leer'
                : 'Intenta con otros criterios de búsqueda'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setFilterUnread(false);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row h-[600px]">
            {/* Sidebar - Lista de conversaciones */}
            <div className={cn(
              'flex-col border-r border-gray-200',
              selectedConversation ? 'hidden lg:flex w-full lg:w-96' : 'flex w-full'
            )}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-black">
                  Conversaciones ({filteredConversations.length})
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      'w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left',
                      selectedConversation?.id === conv.id && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 relative">
                        <User className="w-6 h-6 text-gray-600" />
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-black truncate">
                            {conv.customerName}
                          </p>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatDate(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-1">
                          {conv.customerEmail}
                        </p>
                        {conv.productName && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <Package className="w-3 h-3" />
                            <span className="truncate">{conv.productName}</span>
                          </div>
                        )}
                        {conv.orderNumber && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Orden #{conv.orderNumber}</span>
                          </div>
                        )}
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Área de chat */}
            <div className={cn(
              'flex-1 flex-col',
              selectedConversation ? 'flex' : 'hidden lg:flex'
            )}>
              {selectedConversation ? (
                <>
                  {/* Header del chat */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">{selectedConversation.customerName}</h3>
                      <p className="text-sm text-gray-500">{selectedConversation.customerEmail}</p>
                      {selectedConversation.productName && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Package className="w-3 h-3" />
                          {selectedConversation.productName}
                        </p>
                      )}
                      {selectedConversation.orderNumber && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <ShoppingBag className="w-3 h-3" />
                          Orden #{selectedConversation.orderNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                        <h4 className="text-lg font-semibold text-black mb-2">Sin mensajes aún</h4>
                        <p className="text-gray-500">Esta conversación no tiene mensajes</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.senderId === user?.id;
                        const isEditing = editingMessageId === message.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                              {!isOwnMessage && (
                                <span className="text-xs text-gray-500 mb-1 px-2">
                                  {message.sender?.fullName || 'Cliente'}
                                </span>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2 ${
                                  isOwnMessage
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black border border-gray-200'
                                }`}
                              >
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm text-black"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditMessage(message.id)}
                                        className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={cancelEditing}
                                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
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
                                <span className="text-xs text-gray-500">
                                  {formatTime(message.createdAt)}
                                </span>
                                {!isEditing && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => startEditing(message)}
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3 h-3 text-gray-500" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3 h-3 text-gray-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input de mensaje */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escribe un mensaje..."
                        disabled={!isConnected || isSending}
                        className="flex-1 bg-gray-100 border border-gray-300 rounded-full px-4 py-2 text-black focus:outline-none focus:border-black disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || !isConnected || isSending}
                        className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSending ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-black mb-2">Selecciona una conversación</h3>
                    <p className="text-gray-500">
                      Elige una conversación de la lista para comenzar a chatear
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
