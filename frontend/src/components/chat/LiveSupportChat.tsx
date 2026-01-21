import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/contexts/SocketContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: Date;
}

export function LiveSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket && isAuthenticated && isOpen) {
      // Conectar al chat de soporte
      socket.emit('customer:join-support', { userId: user?.id });

      // Escuchar cuando se conecta
      socket.on('support:connected', () => {
        setIsConnected(true);
        toast.success('Conectado con soporte');
      });

      // Escuchar mensajes del admin
      socket.on('support:message', (data: { message: string; adminName: string }) => {
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'admin',
          text: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
      });

      // Escuchar cuando el admin se desconecta
      socket.on('support:disconnected', () => {
        setIsConnected(false);
        toast('El agente se ha desconectado', { icon: '👋' });
      });

      return () => {
        socket.off('support:connected');
        socket.off('support:message');
        socket.off('support:disconnected');
        socket.emit('customer:leave-support');
      };
    }
  }, [socket, isAuthenticated, isOpen, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    socket.emit('support:customer-message', {
      userId: user?.id,
      message: inputMessage,
    });
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ventana de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  {isConnected && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-black rounded-full"></span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Soporte en Vivo</h3>
                  <p className="text-xs text-gray-300">
                    {isConnected ? 'Agente disponible' : 'Esperando conexión...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">
                        ¡Hola! ¿En qué podemos ayudarte hoy?
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-black text-white'
                            : 'bg-white text-black border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isConnected ? "Escribe tu mensaje..." : "Esperando conexión..."}
                      disabled={!isConnected}
                      rows={1}
                      className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || !isConnected}
                      className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona Enter para enviar
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
