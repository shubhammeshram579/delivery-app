'use client';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { Package, Plus, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { fetchOrders, selectOrders, selectOrdersLoading } from '../../../redux/slices/orderSlice';
import { selectUser } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatCard, StatusBadge, LoadingSpinner, EmptyState } from '../../../components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function CustomerDashboard() {
  // useRequireAuth('customer');
  const { isAuthenticated, isInitialized } = useRequireAuth('customer');

  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);

  useEffect(() => {
    dispatch(fetchOrders({ limit: 5 }));
  }, [dispatch]);

  const stats = {
    total: orders.length,
    active: orders.filter((o) => ['pending', 'accepted', 'picked_up', 'in_transit'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };


    // KEY: show spinner while auth check is in progress
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <DashboardLayout role="customer" title="Dashboard">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-300">Good morning, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your deliveries.</p>
      </div>

      {/* Quick action */}
      <Link href="/customer/orders/new" className="btn-primary inline-flex items-center gap-2 mb-6">
        <Plus className="h-4 w-4" />
        Place New Order
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Orders" value={stats.total} icon={Package} color="blue" />
        <StatCard title="Active" value={stats.active} icon={MapPin} color="orange" />
        <StatCard title="Delivered" value={stats.delivered} icon={CheckCircle} color="green" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="red" />
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Recent Orders</h3>
          <Link href="/customer/orders" className="text-sm text-primary-600 hover:underline">View all</Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Place your first delivery order to get started."
            action={
              <Link href="/customer/orders/new" className="btn-primary">
                Place Order
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-900 ">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} href={`/customer/orders/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300 truncate">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{order.dropAddress}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
