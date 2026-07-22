'use client';
import { useState } from 'react';
import { Sparkles, X, MessageCircleQuestion } from 'lucide-react';
import { useAI } from '../../hooks/useAI';

/**
 * AI Price Explainer
 * Small button next to price breakdown — click to get plain-language explanation
 *
 * Usage: <AIPriceExplainer order={order} />
 */
export default function AIPriceExplainer({ order }) {
  const { explainPrice, loading } = useAI();
  const [open,        setOpen]        = useState(false);
  const [explanation, setExplanation] = useState(null);

  const handleClick = async () => {
    setOpen(true);
    if (explanation) return; // already fetched
    try {
      const text = await explainPrice({
        totalAmount: order.totalAmount,
        basePrice:   order.basePrice,
        deliveryFee: order.deliveryFee,
        distance:    order.distance,
        weight:      order.packageWeight,
        vehicleType: order.driver?.vehicleType || 'bike',
      });
      setExplanation(text);
    } catch {
      setExplanation("Sorry, I couldn't generate an explanation right now.");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
      >
        <MessageCircleQuestion className="h-3.5 w-3.5" />
        Why this price?
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
          <div className="card fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[90%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-primary-50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300">AI Price Breakdown</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white rounded-lg">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
                  Thinking...
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}