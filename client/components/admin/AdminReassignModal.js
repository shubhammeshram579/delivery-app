'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Star, Zap, TrendingUp, RefreshCw, UserCheck } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * AdminReassignModal — manual driver assignment (Phase 1) + trigger auto-match (Phase 2)
 * Robustly handles API responses to prevent Toast display errors.
 */
export default function AdminReassignModal({ orderId, open, onClose, onAssigned }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [assigning, setAssigning]   = useState(null); // driverId or 'auto'

  useEffect(() => {
    if (!open || !orderId) return;
    loadCandidates();
  }, [open, orderId]);

  // Helper function to extract error messages cleanly from API responses
  const getErrorMessage = (err, fallback) => {
    if (err?.response?.data) {
      // Common backend error patterns
      return (
        err.response.data.message || 
        err.response.data.error || 
        err.response.data.err || 
        fallback
      );
    }
    return err?.message || fallback;
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/matching/orders/${orderId}/candidates`);
      // Standardize payload extraction
      const list = data?.data?.candidates || data?.candidates || [];
      setCandidates(list);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load candidate drivers');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const assignManually = async (driverId) => {
    setAssigning(driverId);
    try {
      await api.post(`/matching/orders/${orderId}/assign`, { driverId });
      toast.success('Driver assigned successfully');
      
      // Fast state update
      onAssigned?.();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to assign driver');
      toast.error(msg);
    } finally {
      setAssigning(null);
    }
  };

  const triggerAutoAssign = async () => {
    setAssigning('auto');
    try {
      const { data } = await api.post(`/matching/orders/${orderId}/auto-assign`);
      
      // Match against dynamic API response shapes safely
      const isSuccess = data?.success || data?.data?.success;
      const driverName = data?.offeredTo?.name || data?.data?.offeredTo?.name || 'Best Match';

      if (isSuccess) {
        toast.success(`Auto-assigned to ${driverName}`);
        onAssigned?.();
        onClose();
      } else {
        toast.error(data?.message || 'No drivers available for auto-assignment');
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Auto-assign failed');
      toast.error(msg);
    } finally {
      setAssigning(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Reassign Driver</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ranked by match score — distance, rating, acceptance rate, workload</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Auto-assign shortcut */}
        <div className="px-5 py-3 bg-primary-50 border-b border-primary-100 flex-shrink-0">
          <button
            onClick={triggerAutoAssign}
            disabled={assigning !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5  bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {assigning === 'auto' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Auto-assigning...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" /> Auto-Assign Best Match
              </>
            )}
          </button>
        </div>

        {/* Candidate list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center px-6">
              <UserCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No available drivers nearby</p>
              <p className="text-xs text-gray-400 mt-1">Try expanding search radius or wait for drivers to come online</p>
              <button onClick={loadCandidates} className="text-xs text-primary-600 hover:underline mt-3 flex items-center gap-1 mx-auto">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {candidates.map((c, i) => (
                <div key={c.driverId} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                  {/* Rank badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>

                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                    {c.name?.[0]?.toUpperCase() || 'D'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {i === 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">BEST MATCH</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {c.distance}km</span>
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3" /> {c.rating?.toFixed(1) || 'New'}</span>
                      <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> {c.acceptanceScore?.toFixed(0)}% accept</span>
                      <span className="capitalize">{c.vehicleType}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-sm font-bold text-primary-700">{c.finalScore?.toFixed(0) || 0}</p>
                    <p className="text-[10px] text-gray-400">score</p>
                  </div>

                  <button
                    onClick={() => assignManually(c.driverId)}
                    disabled={assigning !== null}
                    className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {assigning === c.driverId ? '...' : 'Assign'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}