'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useAI } from '../../hooks/useAI';

/**
 * AI Smart Reply — for driver chat
 * Shows a "Generate Reply" button above the chat input.
 * Click → AI drafts a reply based on the customer's last message.
 *
 * Usage: <AISmartReply lastCustomerMessage={msg} orderStatus={order.status} onUse={(text) => setChatInput(text)} />
 */
export default function AISmartReply({ lastCustomerMessage, orderStatus, onUse }) {
  const { smartReply, loading } = useAI();
  const [suggestion, setSuggestion] = useState(null);

  if (!lastCustomerMessage) return null;

  const generate = async () => {
    try {
      const reply = await smartReply(lastCustomerMessage, orderStatus);
      setSuggestion(reply);
    } catch {
      // silently fail — not critical feature
    }
  };

  return (
    <div className="mb-2">
      {!suggestion ? (
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
        >
          {loading
            ? <><span className="w-3 h-3 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /> Generating...</>
            : <><Sparkles className="h-3.5 w-3.5" /> Generate Smart Reply</>
          }
        </button>
      ) : (
        <div className="p-2.5 bg-primary-50 border border-primary-100 rounded-lg">
          <p className="text-xs text-gray-700 mb-2">{suggestion}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { onUse(suggestion); setSuggestion(null); }}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Use this reply
            </button>
            <button onClick={generate} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
            <button onClick={() => setSuggestion(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}