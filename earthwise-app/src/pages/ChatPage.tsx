import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { sendChatMessage } from '../services';
import EmptyState from '../components/EmptyState';
import type { ChatMessage } from '../types';

export default function ChatPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!analysisData) {
    return (
      <EmptyState
        title="No Report Loaded"
        description="Upload a geotechnical report to chat with the AI assistant about your analysis."
        action={
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center px-4 py-2 bg-[var(--accent-color)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            <Upload size={16} className="mr-2" />
            Upload Report
          </button>
        }
      />
    );
  }

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
        analysisData.projectSummary.projectName
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

  const suggestions = [
    'What are the groundwater conditions?',
    'Describe the soil types found.',
    'What foundation type is recommended?',
    'What are the main risk flags?',
    'Is there rock or refusal?',
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Chat AI
      </h1>

      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg flex flex-col h-[calc(100vh-220px)]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare
                size={48}
                className="mx-auto mb-4 text-[var(--text-muted)] opacity-50"
              />
              <h3
                className="text-lg font-medium text-[var(--text-primary)] mb-2"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                Ask about your report
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Get insights about {analysisData.projectSummary.projectName}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-color)] hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
                className={`max-w-[70%] px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === 'user'
                      ? 'text-white/60'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[var(--bg-tertiary)] px-4 py-3 rounded-lg">
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
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about the geotechnical report..."
              className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] placeholder-[var(--text-muted)]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-4 py-3 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
