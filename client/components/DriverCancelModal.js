'use client';
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CANCEL_REASONS = [
  'Vehicle breakdown',
  'Personal emergency',
  'Traffic/road blocked',
  'Unable to locate pickup',
  'Customer unreachable',
  'Other',
];

/**
 * DriverCancelModal — for driver order detail page
 * This is different from the customer cancel — it triggers the
 * matching engine to find a replacement driver automatically.
 *
 * Usage: <DriverCancelModal orderId={order.id} open={show} onClose={...} onCancelled={...} />
 */
export default function DriverCancelModal({ orderId, open, onClose, onCancelled }) {
  const [reason, setReason]     = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading]   = useState(false);

  if (!open) return null;

  const finalReason = reason === 'Other' ? customReason : reason;

  const handleSubmit = async () => {
    if (!finalReason?.trim()) {
      toast.error('Please select or enter a reason');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/matching/orders/${orderId}/driver-cancel`, { reason: finalReason });
      toast.success('Order cancelled — finding a new driver');
      onCancelled?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[90%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Cancel This Delivery</h3>
              <p className="text-xs text-gray-500">A replacement driver will be found automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-colors ${
                reason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
            >
              {r}
            </button>
          ))}

          {reason === 'Other' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please explain..."
              rows={2}
              className="input-field resize-none text-sm mt-2"
            />
          )}
        </div>

        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 btn-secondary text-sm">Keep Order</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="flex-1 btn-danger text-sm disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </>
  );
}