import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Bot, User, Sparkles, BookOpen, Bookmark, BookText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // FIXED: Correct Google Gemini API endpoint (NO double ?key)
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  // Reset auto-close timer when user interacts
  const resetAutoClose = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    resetAutoClose();
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // FIXED: Correct request body format
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userMessage.content }]
            }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("API ERROR:", err);
        throw new Error(err.error?.message || "Gemini API call failed");
      }

      const data = await response.json();
      console.log("📩 Gemini API Response:", data);

      // Extract Gemini response
      let aiResponse = "Sorry, I could not process your request.";

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        aiResponse = data.candidates[0].content.parts[0].text;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle click outside to close chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Clear timer when manually closing
  const handleClose = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <motion.div 
        className="fixed bottom-8 right-8 z-[9999]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            <MessageCircle className="h-8 w-8" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </motion.div>
    );
  }

  // Suggested questions for quick replies
  const suggestedQuestions = [
    'Recommend a children\'s book',
    'What are some good bedtime stories?',
    'How to encourage kids to read more?',
    'Best books for 5 year olds'
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <motion.div
        ref={chatRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 30 }}
        className="w-96 h-[600px] bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <BookOpen size={20} />
            </div>
            <h3 className="font-bold text-lg">KidLit Assistant</h3>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="p-3 bg-blue-50 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">How can I help you today?</h3>
              <p className="text-gray-500 mb-6 max-w-xs">Ask me about children's books, reading tips, or story recommendations!</p>
              
              <div className="w-full space-y-2">
                {suggestedQuestions.map((question, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setInput(question);
                      // Auto-submit after a short delay for better UX
                      setTimeout(() => {
                        document.querySelector('form')?.requestSubmit();
                      }, 50);
                    }}
                    className="w-full text-left p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-700 shadow-sm"
                  >
                    "{question}"
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      {msg.role === 'assistant' && (
                        <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Bot size={16} className="text-indigo-600" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-50 border border-gray-100 rounded-bl-none text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User size={16} className="text-blue-600" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot size={16} className="text-indigo-600" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl rounded-bl-none">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about children's books..."
            className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            disabled={isLoading}
            aria-label="Type your message"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileTap={{ scale: 0.95 }}
            className={`absolute right-2 p-1.5 rounded-full ${
              input.trim() ? 'bg-blue-600 text-white' : 'text-gray-400'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} transition-colors`}
            aria-label="Send message"
          >
            <Send size={18} className="transform -rotate-45" />
          </motion.button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">
          KidLit Assistant can make mistakes. Consider checking important information.
        </p>
        </form>
      </motion.div>
    </div>
  );
}
