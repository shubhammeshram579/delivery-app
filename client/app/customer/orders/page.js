'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { Package, Plus, Search } from 'lucide-react';
import { fetchOrders, selectOrders, selectOrdersLoading } from '../../../redux/slices/orderSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatusBadge, Pagination, LoadingSpinner, EmptyState } from '../../../components/ui';
import { format } from 'date-fns';

const STATUSES = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];

export default function CustomerOrdersPage() {
  useRequireAuth('customer');
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // console.log(orders)

  useEffect(() => {
    dispatch(fetchOrders({ page, limit: 10, status: status || undefined , orderNumber:search }));
  }, [page, status,search, dispatch]);

  return (
    <DashboardLayout role="customer" title="My Orders">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search by order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s === 'all' ? '' : s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <Link href="/customer/orders/new" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState icon={Package} title="No orders found" description="Place your first order to get started."
            action={<Link href="/customer/orders/new" className="btn-primary">Place Order</Link>} />
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-gray-900 ">
              {orders.map((order) => (
                <Link key={order.id} href={`/customer/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900  dark:text-gray-300">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{order.dropAddress}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <StatusBadge status={order.status} />
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-300">₹{order.totalAmount}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
