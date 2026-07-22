'use client';
import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, PackageSearch, AlertCircle } from 'lucide-react';

// ── LoadingSpinner ────────────────────────────────────────
export function LoadingSpinner({ size = 'md', fullscreen = false, text }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} border-2 border-gray-200 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center py-8">{spinner}</div>;
}

// ── StatusBadge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const config = {
    pending:    { bg: 'bg-yellow-100 dark:bg-yellow-500/15', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
    accepted:   { bg: 'bg-blue-100 dark:bg-blue-500/15',     text: 'text-blue-800 dark:text-blue-400',     label: 'Accepted' },
    picked_up:  { bg: 'bg-indigo-100 dark:bg-indigo-500/15', text: 'text-indigo-800 dark:text-indigo-400', label: 'Picked Up' },
    in_transit: { bg: 'bg-purple-100 dark:bg-purple-500/15', text: 'text-purple-800 dark:text-purple-400', label: 'In Transit' },
    delivered:  { bg: 'bg-green-100 dark:bg-green-500/15',   text: 'text-green-800 dark:text-green-400',   label: 'Delivered' },
    cancelled:  { bg: 'bg-red-100 dark:bg-red-500/15',       text: 'text-red-800 dark:text-red-400',       label: 'Cancelled' },
    failed:     { bg: 'bg-gray-100 dark:bg-gray-500/15',     text: 'text-gray-600 dark:text-gray-400',     label: 'Failed' },
    success:    { bg: 'bg-green-100 dark:bg-green-500/15',   text: 'text-green-800 dark:text-green-400',   label: 'Paid' },
    refunded:   { bg: 'bg-blue-100 dark:bg-blue-500/15',     text: 'text-blue-800 dark:text-blue-400',     label: 'Refunded' },
  };

  const c = config[status] || { bg: 'bg-gray-100 dark:bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────
// export function Pagination({ page, totalPages, onPageChange }) {
//   if (totalPages <= 1) return null;

//   return (
//     <div className="flex items-center justify-center gap-2 mt-6">
//       <button
//         onClick={() => onPageChange(page - 1)}
//         disabled={page === 1}
//         className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//       >
//         <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
//       </button>

//       <div className="flex gap-1">
//         {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//           let pageNum;
//           if (totalPages <= 5) pageNum = i + 1;
//           else if (page <= 3) pageNum = i + 1;
//           else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
//           else pageNum = page - 2 + i;

//           return (
//             <button
//               key={pageNum}
//               onClick={() => onPageChange(pageNum)}
//               className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
//                 pageNum === page
//                   ? 'bg-primary-600 text-white'
//                   : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
//               }`}
//             >
//               {pageNum}
//             </button>
//           );
//         })}
//       </div>

//       <button
//         onClick={() => onPageChange(page + 1)}
//         disabled={page === totalPages}
//         className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//       >
//         <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
//       </button>
//     </div>
//   );
// }



export function Pagination({ 
  page, 
  totalPages, 
  pageSize, 
  onPageChange, 
  onPageSizeChange 
}) {
  // if (totalPages <= 1) return null;

  // Logic to calculate page numbers with ellipsis (...)
  const getPageNumbers = () => {
    const siblingCount = 1;
    const totalPageNumbers = 5; // Configured for a tight, clean look

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      return [1, 2, 3, 'DOTS', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      return [1, 'DOTS', totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'DOTS', page, 'DOTS', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-4 text-black select-none">
      
      {/* Left Section: Rows Per Page Selector (Matches image_31f9bd.png) */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-normal text-gray-700 dark:text-gray-400 tracking-wide">
          Rows per page
        </span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="appearance-none bg-slate-100 dark:bg-primary-600/20 dark:border-gray-700 text-primary-600 text-sm font-medium rounded-xl border border-slate-200 pl-4 pr-10 py-2 cursor-pointer transition-colors focus:outline-none focus:border-slate-300 min-w-[70px]"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {/* Custom Arrow matching the clean down chevron */}
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Section: Navigation Links (Matches image_31f960.png) */}
      <div className="flex items-center gap-4 text-sm font-medium">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-2 px-2 py-1 text-black dark:text-gray-300  disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          <span>Previous</span>
        </button>

        {/* Number Array Track */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'DOTS') {
              return (
                <span
                  key={`dots-${index}`}
                  className="w-10 h-10 flex items-center justify-center text-black font-bold tracking-widest px-1"
                >
                  ...
                </span>
              );
            }

            const isSelected = pageNum === page;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(Number(pageNum))}
                className={`w-10 h-10 rounded-xl font-medium text-sm transition-all flex items-center justify-center ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-primary-600/20 dark:border-gray-700 text-primary-600 border border-slate-200 shadow-md'
                    : 'text-black dark:text-gray-300 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-primary-600/20 dark:hover:border-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center gap-2 px-2 py-1 text-black dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
}


// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon: Icon = PackageSearch, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">{description}</p>}
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
      <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${sizes[size]} animate-in max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
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
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
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
    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-700 dark:text-red-400">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

// ── StatCard (for dashboards) ─────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
