'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, StatusBadge, Pagination, EmptyState } from '../../../components/ui';
import { adminService } from '../../../services';
import { Package } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  useRequireAuth('admin');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    adminService.getOrders({ page, limit: 15, status: status || undefined })
      .then((res) => { setOrders(res.data.data.orders); setTotal(res.data.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, status]);

  return (
    <DashboardLayout role="admin" title="All Orders">
      <div className="flex gap-3 mb-5">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Order #', 'Customer', 'Driver', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <tr><td colSpan={6}><LoadingSpinner /></td></tr>
              : orders.length === 0 ? <tr><td colSpan={6}><EmptyState icon={Package} title="No orders" /></td></tr>
              : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">#{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customer?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{o.driver?.user?.name || '—'}</td>
                  <td className="px-4 py-3 font-medium">₹{o.totalAmount}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM yy')}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t">
          <Pagination page={page} totalPages={Math.ceil(total / 15)} onPageChange={setPage} />
        </div>
      </div>
    </DashboardLayout>
  );
}
