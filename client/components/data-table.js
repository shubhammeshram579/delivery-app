'use client';
import React from 'react';
import { Pagination, EmptyState, LoadingSpinner } from '../components/ui'; 

export function DataTable({
  data = [],
  columns = [],
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There is no data available to show in this view.",
  pagination = {},
  onPageChange,
  onPageSizeChange,
}) {
  if (loading) return <LoadingSpinner text="Loading data..." />;
  
  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-black">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {columns.map((col, idx) => (
                <th 
                  key={col.id || idx} 
                  className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-gray-700">
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((col, colIndex) => {
                  return (
                    <td 
                      key={col.id || colIndex} 
                      className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {/* If a custom render method is provided, use it. Otherwise, look up the raw cell string value */}
                      {col.render 
                        ? col.render(row) 
                        : row[col.accessorKey] ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Embedded Generic Pagination */}
      {pagination && (
        <Pagination
          page={pagination.page || 1}
          totalPages={pagination.totalPages || 1}
          pageSize={pagination.limit || 10}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}