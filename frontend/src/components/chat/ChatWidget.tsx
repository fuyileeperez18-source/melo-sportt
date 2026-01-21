import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minus,
  Bot,
  User,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  MoreVertical,
} from 'lucide-react';
import { useChatStore, quickReplies } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const {
    isOpen,
    isMinimized,
    messages,
    isTyping,
    toggleChat,
    closeChat,
    minimizeChat,
    maximizeChat,
    sendMessage,
    handleQuickReply,
    startNewConversation,
    editMessage,
    deleteMessage,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showMenuForMessage, setShowMenuForMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
    setShowMenuForMessage(null);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      editMessage(editingMessageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId);
    setShowMenuForMessage(null);
  };

  // Welcome message
  const welcomeMessage: typeof messages[0] = {
    id: 'welcome',
    conversation_id: 'local',
    content: '¡Hola! 👋 Soy MELOBOT, tu asistente de MELO SPORTT. ¿En qué puedo ayudarte hoy?',
    sender_type: 'bot',
    message_type: 'text',
    is_read: true,
    created_at: new Date().toISOString(),
  };

  const allMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <>
      {/* Chat button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-40 p-4 bg-white text-black rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />

            {/* Notification dot */}
            <span className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : '500px',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 w-96 bg-primary-900 rounded-2xl shadow-2xl border border-primary-800 overflow-hidden flex flex-col',
              isMinimized && 'h-auto'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white text-black">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold">MELOBOT</h3>
                  <p className="text-xs text-gray-600">En línea • Listo para ayudarte</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={startNewConversation}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Nueva conversación"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={isMinimized ? maximizeChat : minimizeChat}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isMinimized ? "Maximizar" : "Minimizar"}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={closeChat}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {allMessages.map((message, index) => (
                    <motion.div
                      key={message.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex gap-3 group relative',
                        message.sender_type === 'user' && 'flex-row-reverse'
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          message.sender_type === 'user'
                            ? 'bg-white text-black'
                            : 'bg-primary-800 text-white'
                        )}
                      >
                        {message.sender_type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message bubble */}
                      <div className={cn('max-w-[75%] relative', message.sender_type === 'user' && 'flex flex-col items-end')}>
                        {editingMessageId === message.id ? (
                          <div className="bg-white rounded-2xl px-4 py-3 rounded-tr-sm">
                            <input
                              type="text"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full text-sm text-black bg-transparent outline-none"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={handleSaveEdit}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-3',
                              message.sender_type === 'user'
                                ? 'bg-white text-black rounded-tr-sm'
                                : 'bg-primary-800 text-white rounded-tl-sm'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {(message.metadata?.edited as boolean) && (
                              <span className="text-xs opacity-60">(editado)</span>
                            )}
                          </div>
                        )}

                        {/* Edit/Delete menu for user messages */}
                        {message.sender_type === 'user' && message.id !== 'welcome' && !editingMessageId && (
                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setShowMenuForMessage(showMenuForMessage === message.id ? null : message.id)}
                              className="p-1 text-gray-400 hover:text-white rounded"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {showMenuForMessage === message.id && (
                              <div className="absolute right-0 top-full mt-1 bg-primary-800 rounded-lg shadow-lg border border-primary-700 overflow-hidden z-10">
                                <button
                                  onClick={() => handleStartEdit(message.id, message.content)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-primary-700 w-full"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-primary-700 w-full"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 bg-primary-800 rounded-full flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="bg-primary-800 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-gray-400 mb-2">Respuestas rápidas:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <motion.button
                          key={reply.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleQuickReply(reply)}
                          className="px-3 py-1.5 bg-primary-800 text-sm text-white rounded-full hover:bg-primary-700 transition-colors"
                        >
                          {reply.text}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-primary-800">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 h-11 px-4 bg-primary-800 border border-primary-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-white/30 transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="h-11 w-11 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
