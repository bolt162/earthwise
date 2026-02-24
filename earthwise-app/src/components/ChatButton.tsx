import { MessageSquare, X, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { sendChatMessage } from '../services';
import type { ChatMessage } from '../types';

export default function ChatButton() {
  const isChatOpen = useAppStore((s) => s.isChatOpen);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const analysisData = useAppStore((s) => s.analysisData);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(
        input.trim(),
        analysisData?.projectSummary.projectName
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      addChatMessage(assistantMessage);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isChatOpen
            ? 'bg-[var(--error-color)] hover:bg-red-600'
            : 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)]'
        }`}
      >
        {isChatOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageSquare size={24} className="text-white" />
        )}
      </button>

      {/* Chat panel */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-[var(--card-bg)] rounded-lg shadow-2xl flex flex-col animate-slide-in-right border border-[var(--border-color)]">
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--header-bg)] rounded-t-lg"
          >
            <h3
              className="font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Earthwise AI Assistant
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Ask questions about your geotechnical report
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-sm py-8">
                <MessageSquare
                  size={32}
                  className="mx-auto mb-3 opacity-50"
                />
                <p>No messages yet.</p>
                <p className="mt-1">
                  Try asking about soil conditions, groundwater, or
                  recommendations.
                </p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-tertiary)] px-3 py-2 rounded-lg text-sm text-[var(--text-muted)]">
                  <span className="inline-flex space-x-1">
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--border-color)]">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the report..."
                className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] placeholder-[var(--text-muted)]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2 rounded-md bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
