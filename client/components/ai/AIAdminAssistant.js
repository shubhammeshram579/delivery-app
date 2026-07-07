'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User } from 'lucide-react';
import { useAI } from '../../hooks/useAI';

const SUGGESTED_QUESTIONS = [
  'What is our revenue this week?',
  'How many active drivers do we have?',
  'Are there any delayed orders right now?',
  'What is our order delivery rate this month?',
];

/**
 * AI Admin Assistant — full chat interface for admin dashboard
 * Ask natural language questions about business data
 *
 * Usage: <AIAdminAssistant /> — drop into admin/dashboard/page.js
 */
export default function AIAdminAssistant() {
  const { adminQuery, loading } = useAI();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI operations assistant. Ask me anything about your delivery business — revenue, orders, drivers, or delays." },
  ]);

  console.log("messages",messages)
  
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (question) => {
    const q = question || input;
    if (!q.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');

    try {
      const answer = await adminQuery(q);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I ran into an error processing that. Please try again.' }]);
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: '480px' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">AI Operations Assistant</h3>
          <p className="text-xs text-gray-400">Ask about revenue, orders, drivers, and delays</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' ? 'bg-gray-200' : 'bg-primary-100'
            }`}>
              {m.role === 'user'
                ? <User className="h-3.5 w-3.5 text-gray-600" />
                : <Bot className="h-3.5 w-3.5 text-primary-600" />
              }
            </div>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
              m.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested questions — show only at start */}
      {messages.length === 1 && (
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask about your business..."
          className="input-field flex-1 text-sm"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-primary px-3 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}