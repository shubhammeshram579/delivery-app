'use client';

import React from 'react';

export const OrderOfferModal = ({ offer, timeLeft, onAccept, onReject }) => {
  if (!offer) return null;

  // ── SVG Sanitization to block NaN or Infinity crashes ──
  const totalSeconds = offer.expiresInSeconds || 60;
  const sanitizedTimeLeft = Math.max(0, Math.min(timeLeft, totalSeconds));
  
  // Guard against division by 0
  const progress = totalSeconds > 0 ? (sanitizedTimeLeft / totalSeconds) * 100 : 0;
  
  const radius = 28;
  const circumference = 2 * Math.PI * radius; // ~175.929
  
  // Ensure strokeDashoffset is a safe, clean number
  const strokeDashoffset = Number.isNaN(progress) 
    ? circumference 
    : circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white text-white shadow-2xl border border-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header containing the animated SVG progress ring */}
        <div className="flex flex-col items-center bg-primary-600 p-6 text-center border-b border-white">
          <div className="relative flex items-center justify-center w-20 h-20 mb-3">
            <svg className="w-full h-full transform -rotate-90">
              {/* Outer tracking background ring */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Active countdown animated progress stroke */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-amber-500 transition-all duration-1000 ease-linear"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-bold font-mono tracking-tighter text-amber-400">
              {sanitizedTimeLeft}s
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">New Order Offer!</h2>
          <p className="text-xs text-slate-400 mt-1">Accept before the timer runs out</p>
        </div>

        {/* Offer details & parameters */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center bg-primary-50 p-3 rounded-lg border border-primary-600">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Estimated Earning</span>
              <span className="text-2xl font-black text-black">${Number(offer.earning || 0).toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Distance</span>
              <span className="text-lg font-bold text-primary-600">{offer.distance || '0.0'} miles</span>
            </div>
          </div>

          {/* Location details */}
          <div className="space-y-3 relative before:absolute before:left-3 before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-800">
            <div className="flex items-start gap-3 pl-6 relative">
              <div className="absolute left-2 top-[6px] w-2 h-2 rounded-full bg-primary-600" />
              <div>
                <h4 className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Pickup</h4>
                <p className="text-sm text-black line-clamp-2">{offer.pickupAddress || 'Unknown location'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pl-6 relative">
              <div className="absolute left-2 top-[6px] w-2 h-2 rounded-full bg-amber-500" />
              <div>
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Dropoff</h4>
                <p className="text-sm text-black line-clamp-2">{offer.dropoffAddress || 'Unknown location'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interaction Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onReject}
            type="button"
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-primary-100 text-slate-600 border border-slate-700/20 hover:bg-red-700  hover:border hover:border-red-700 hover:text-slate-200 active:scale-[0.98] transition-all"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            type="button"
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-primary-600 text-slate-200 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
          >
            Accept Job
          </button>
        </div>

      </div>
    </div>
  );
};