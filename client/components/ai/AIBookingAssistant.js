'use client';
import { useState } from 'react';
import { Sparkles, Send, Package, MapPin, Weight, Truck, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { LoadingSpinner } from '../ui';
import toast from 'react-hot-toast';

const VEHICLE_ICONS = { bike: '🏍️', scooter: '🛵', car: '🚗', van: '🚐', truck: '🚛' };

/**
 * AI Booking Assistant
 * Customer types natural language → AI extracts structured order data
 *
 * Usage: <AIBookingAssistant onConfirm={(data) => prefillOrderForm(data)} />
 */
export default function AIBookingAssistant({ onConfirm }) {
  const { bookingAssistant, loading } = useAI();
  const [input,  setInput]  = useState('');
  const [result, setResult] = useState(null);

  const EXAMPLES = [
    'Move a washing machine from Baner to Hinjewadi tomorrow morning',
    'Send 8 cartons of books from my office to home',
    'I need to send a fragile laptop urgently',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const data = await bookingAssistant(input);
      if (data.parse_error) {
        toast.error("AI couldn't understand — try rephrasing");
        return;
      }
      setResult(data);
    } catch {
      toast.error('AI assistant is unavailable right now');
    }
  };

  const handleConfirm = () => {
    onConfirm?.(result);
    setResult(null);
    setInput('');
  };

  return (
    <div className="card p-5 border-2 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">AI Booking Assistant</h3>
          <p className="text-xs text-gray-500">Describe your delivery in plain words</p>
        </div>
      </div>

      {!result && (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I need to move a washing machine from Baner to Hinjewadi tomorrow morning"
              rows={3}
              className="input-field resize-none text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Understanding your request...</>
                : <><Send className="h-4 w-4" /> Ask AI Assistant</>
              }
            </button>
          </form>

          {/* Example prompts */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1.5">Try:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  {ex.slice(0, 30)}...
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* AI extraction result */}
      {result && !result.parse_error && (
        <div className="space-y-3 animate-in">
          <div className="flex items-center gap-2 text-xs text-primary-600 font-medium mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            AI understood your request
            {result.confidence && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {result.confidence} confidence
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {result.pickup && (
              <div className="flex items-center gap-3 p-3">
                <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm text-gray-800">{result.pickup}</p>
                </div>
              </div>
            )}
            {result.drop && (
              <div className="flex items-center gap-3 p-3">
                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Drop</p>
                  <p className="text-sm text-gray-800">{result.drop}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3">
              <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Item</p>
                <p className="text-sm text-gray-800">{result.item}</p>
              </div>
            </div>
            {result.weight_kg && (
              <div className="flex items-center gap-3 p-3">
                <Weight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Estimated Weight</p>
                  <p className="text-sm text-gray-800">{result.weight_kg} kg</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3">
              <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Suggested Vehicle</p>
                <p className="text-sm text-gray-800 capitalize">
                  {VEHICLE_ICONS[result.vehicle]} {result.vehicle}
                </p>
              </div>
            </div>
          </div>

          {/* Clarifying questions */}
          {result.questions?.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <HelpCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700">
                <p className="font-medium mb-1">A few more details needed:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setResult(null)} className="btn-secondary flex-1 text-sm">
              Try Again
            </button>
            <button onClick={handleConfirm} className="btn-primary flex-1 text-sm">
              Use This Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}