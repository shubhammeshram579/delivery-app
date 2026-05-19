'use client';
import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, PackageSearch, AlertCircle } from 'lucide-react';

// ── LoadingSpinner ────────────────────────────────────────
export function LoadingSpinner({ size = 'md', fullscreen = false, text }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center py-8">{spinner}</div>;
}

// ── StatusBadge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const config = {
    pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    accepted:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Accepted' },
    picked_up:  { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Picked Up' },
    in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Transit' },
    delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Delivered' },
    cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
    failed:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Failed' },
    // Payment
    success:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Paid' },
    refunded:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Refunded' },
  };

  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = page - 2 + i;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                pageNum === page
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon: Icon = PackageSearch, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} animate-in max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

// ── ErrorAlert ────────────────────────────────────────────
export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

// ── StatCard (for dashboards) ─────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
