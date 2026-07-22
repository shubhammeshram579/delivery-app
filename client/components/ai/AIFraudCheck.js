'use client';
import { useState } from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { useAI } from '../../hooks/useAI';

/**
 * AI Fraud Check — button on admin drivers page
 * Click to analyze a specific driver for suspicious patterns
 *
 * Usage: <AIFraudCheck driverId={driver.userId} />
 */
export default function AIFraudCheck({ driverId }) {
  const { checkFraud, loading } = useAI();
  const [analysis, setAnalysis] = useState(null);
  const [open, setOpen] = useState(false);

  const runCheck = async () => {
    setOpen(true);
    try {
      const result = await checkFraud(driverId);
      setAnalysis(result);
    } catch {
      setAnalysis('Could not complete fraud analysis.');
    }
  };

  return (
    <>
      <button
        onClick={runCheck}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 dark:bg-primary-600/20 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
      >
        <ShieldAlert className="h-3.5 w-3.5" /> AI Fraud Check
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[90%] max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b bg-orange-50">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">AI Fraud Analysis</h3>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                  Analyzing driver patterns...
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{analysis}</p>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => setOpen(false)} className="btn-secondary w-full text-sm">Close</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}