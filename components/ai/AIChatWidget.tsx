import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Minimize2,
  Maximize2,
  Sparkles,
  Home,
  TrendingUp,
  MapPin,
  Phone
} from 'lucide-react';

const PRIMARY_COLOR = '#029bba';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { icon: <Home className="w-4 h-4" />, text: 'Find properties', query: 'I want to find properties' },
    { icon: <TrendingUp className="w-4 h-4" />, text: 'Investment advice', query: 'What are good investment options?' },
    { icon: <MapPin className="w-4 h-4" />, text: 'Best locations', query: 'Which are the best locations to buy?' },
    { icon: <Phone className="w-4 h-4" />, text: 'Contact agent', query: 'I want to speak with an agent' },
  ];

  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: `Hello! 👋 I'm your AI Real Estate Assistant at Highrise.pk. 

I can help you with:
• Finding the perfect property
• Investment recommendations
• Market insights and trends
• Answering your questions about buying, selling, or renting

How can I assist you today?`,
    timestamp: new Date(),
    suggestions: ['Find properties in DHA', 'Best investment areas', 'Property prices in Lahore'],
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    setShowWelcome(false);
    setInput('');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          suggestions: data.suggestions,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Fallback response if API fails
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: getOfflineResponse(text),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getOfflineResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Offline/fallback responses
  const getOfflineResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
      return `Property prices in Pakistan vary significantly by location:

📍 **DHA Lahore**: PKR 2-8 Crore (5-10 Marla)
📍 **Bahria Town**: PKR 1.5-5 Crore (5-10 Marla)
📍 **Gulberg**: PKR 5-15 Crore (Commercial)

Would you like me to show you properties in a specific area?`;
    }
    
    if (lowerQuery.includes('invest') || lowerQuery.includes('investment')) {
      return `Based on current market trends, here are my top investment recommendations:

🏆 **Best Areas for Investment 2025:**
1. DHA Phase 6 (High appreciation potential)
2. Bahria Town Phase 8 (Growing infrastructure)
3. Gulberg Commercial (Strong rental yields)

💡 **Pro Tip:** Commercial plots near metro stations are showing 15-20% annual appreciation.

Shall I show you available properties in these areas?`;
    }
    
    if (lowerQuery.includes('dha')) {
      return `DHA (Defence Housing Authority) is one of Pakistan's most prestigious housing societies. Here's what I know:

🏠 **DHA Lahore Phases:**
- Phase 1-4: Fully developed, premium pricing
- Phase 5-6: Popular for families, good infrastructure
- Phase 7-8: Newer phases, investment potential

📊 **Current Prices (5 Marla):**
- House: PKR 2.5-4 Crore
- Plot: PKR 1.5-2.5 Crore

Would you like to see available listings in DHA?`;
    }
    
    if (lowerQuery.includes('rent')) {
      return `Looking for rental properties? Here's what's available:

🏠 **Rental Ranges in Lahore:**
- 2-Bed Apartment: PKR 40,000-80,000/month
- 3-Bed House: PKR 80,000-150,000/month
- Commercial: PKR 100,000-500,000/month

I can help you find the perfect rental. What's your budget and preferred location?`;
    }
    
    if (lowerQuery.includes('agent') || lowerQuery.includes('contact') || lowerQuery.includes('speak')) {
      return `I'd be happy to connect you with our expert agents! 📞

You can:
1. **Call us:** +92 300 1234567
2. **WhatsApp:** +92 300 1234567
3. **Email:** contact@highrise.pk

Or tell me more about what you're looking for, and I'll have the right agent reach out to you!`;
    }
    
    return `Thank you for your question! I'm here to help you with all your real estate needs.

I can assist you with:
• 🏠 Finding properties (buy/rent)
• 💰 Investment advice
• 📊 Market analysis
• 📍 Location recommendations
• 📞 Connecting with agents

Please ask me anything about Pakistan's real estate market!`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl z-50 flex items-center justify-center group"
            style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #027a94 100%)` }}
          >
            <MessageCircle className="w-7 h-7 text-white" />
            
            {/* Pulse Animation */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: PRIMARY_COLOR }} />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
                Chat with AI Assistant
                <div className="absolute top-full right-6 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col ${
              isMinimized ? 'h-auto' : 'h-[600px] max-h-[80vh]'
            }`}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #027a94 100%)` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    AI Sales Assistant
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </h3>
                  <p className="text-xs text-white/80">
                    {isLoading ? 'Typing...' : 'Online • Ready to help'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 ${
                          message.role === 'user'
                            ? 'bg-[#029bba] text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4 text-[#029bba]" />
                            <span className="text-xs font-medium text-[#029bba]">AI Assistant</span>
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => sendMessage(suggestion)}
                                className="text-xs px-3 py-1.5 rounded-full border border-[#029bba]/30 text-[#029bba] hover:bg-[#029bba]/10 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white rounded-2xl rounded-bl-md p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#029bba]" />
                          <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 1 && (
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(action.query)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-[#029bba] transition-all"
                        >
                          <span style={{ color: PRIMARY_COLOR }}>{action.icon}</span>
                          {action.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about properties..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={isLoading || !input.trim()}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Powered by AI • Available 24/7
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
