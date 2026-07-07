'use client';
import { useState, useEffect } from 'react';
import { Sparkles, PackageCheck } from 'lucide-react';
import { useAI } from '../../hooks/useAI';

/**
 * AI Packaging Advisor
 * Auto-fetches packing tips when item description changes (debounced)
 *
 * Usage: <AIPackagingAdvisor itemDescription={watch('packageDescription')} />
 */
export default function AIPackagingAdvisor({ itemDescription }) {
  const { packagingAdvice, loading } = useAI();
  const [advice, setAdvice] = useState(null);
  const [debounced, setDebounced] = useState('');

  // Debounce input — wait 1.2s after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebounced(itemDescription), 1200);
    return () => clearTimeout(t);
  }, [itemDescription]);

  useEffect(() => {
    if (!debounced || debounced.trim().length < 4) {
      setAdvice(null);
      return;
    }
    packagingAdvice(debounced)
      .then(setAdvice)
      .catch(() => setAdvice(null));
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!debounced || debounced.trim().length < 4) return null;

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <p className="text-xs font-semibold text-blue-800">AI Packaging Tips</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-blue-500">
          <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          Analyzing item...
        </div>
      ) : advice ? (
        <div className="text-xs text-blue-700 leading-relaxed whitespace-pre-line flex gap-2">
          <PackageCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{advice}</span>
        </div>
      ) : null}
    </div>
  );
}