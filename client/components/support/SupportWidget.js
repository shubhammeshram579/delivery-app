'use client';
import { useState, useRef, useEffect } from 'react';
import { LifeBuoy, X, Send, Sparkles, UserCheck, Ticket } from 'lucide-react';
import { useSupportChat } from '../../hooks/useSupportChat';

/**
 * SupportWidget — floating chat bubble, works for both customer and driver
 * Drop this once into your DashboardLayout so it's available on every page.
 *
 * Usage: <SupportWidget /> — add inside DashboardLayout, after {children}
 */
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, loading, ticketNumber, escalated, sendMessage, requestHuman } = useSupportChat();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);


  // console.log("messages",messages)

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-16 sm:bottom-5 right-2 sm:right-5 z-40 w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        >
          <LifeBuoy className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="card fixed bottom-5 right-5 z-40 w-[90vw] max-w-sm h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-primary-600 dark:bg-primary-600/50 text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                {escalated ? <UserCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {escalated ? 'Support Team' : 'AI Support Assistant'}
                </p>
                {ticketNumber && (
                  <p className="text-xs text-primary-100 flex items-center gap-1">
                    <Ticket className="h-3 w-3" /> #{ticketNumber}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="card flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : m.role === 'admin'
                    ? 'bg-green-100 text-green-900 rounded-tl-sm border border-green-200'
                    : m.isEscalation
                    ? 'bg-yellow-50 text-yellow-800 rounded-tl-sm border border-yellow-200'
                    : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                }`}>
                  {m.role === 'admin' && (
                    <p className="text-[10px] font-semibold text-green-600 mb-1 uppercase tracking-wide">Support Agent</p>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Talk to human button — only show before escalation */}
          {!escalated && (
            <div className="px-4 pb-2">
              <button
                onClick={requestHuman}
                disabled={loading}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <UserCheck className="h-3 w-3" /> Talk to a human instead
              </button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-600 flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={escalated ? 'Message support team...' : 'Ask a question...'}
              className="input-field flex-1 text-sm"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}