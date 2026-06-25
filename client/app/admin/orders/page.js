'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, StatusBadge, Pagination, EmptyState } from '../../../components/ui';
import { adminService } from '../../../services';
import { Package, Search,Filter } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  useRequireAuth('admin');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Real-world state configurations matching your updated backend API response
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Set realistic default rows per page
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    // Passing values matching your upgraded API parameters
    adminService.getOrders({ 
      page, 
      limit: pageSize, 
      status: status || undefined,
      search: search || undefined
    })
      .then((res) => { 
        const { orders, totalItems, totalPages } = res.data.data;
        setOrders(orders); 
        setTotalItems(totalItems);
        setTotalPages(totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize, status, search]);

  // Safe handler logic when changing rows-per-page 
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset back to first page to avoid offset bounds errors
  };

  return (
    <DashboardLayout role="admin" title="All Orders">
      {/* Top Filter and Search Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between">
        
        {/* Search Bar for Customer and Driver Details */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            placeholder="Search customer or driver..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-9 w-full" 
          />
        </div>

        {/* Dropdown for Status Filter */}
        
        <div className='flex items-center gap-2'>
          <Filter className="h-4 w-4 text-primary-600" />
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }} 
            className="input-field w-auto capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace('_', ' ') : 'All Status'}
              </option>
            ))}
          </select>
        </div>
        
      </div>

      {/* Orders Data Table Card UI */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Order #', 'Customer', 'Driver', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12"><LoadingSpinner /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="py-12"><EmptyState icon={Package} title="No orders found" /></td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">#{o.orderNumber || o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span>{o.customer?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400 font-normal">{o.customer?.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.driver?.user?.name ? (
                      <div className="flex flex-col">
                        <span>{o.driver.user.name}</span>
                        <span className="text-xs text-gray-400">{o.driver.user.phone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{o.totalAmount}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{o.createdAt ? format(new Date(o.createdAt), 'dd MMM yy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Panel Integration */}
        <div className="px-4 py-3 border-t">
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage} 
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}