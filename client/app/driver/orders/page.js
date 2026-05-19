'use client';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { fetchOrders, selectOrders, selectOrdersLoading } from '../../../redux/slices/orderSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../../components/ui';

export default function DriverOrdersPage() {
  useRequireAuth('driver');
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);

  console.log(orders)


  useEffect(() => { dispatch(fetchOrders({ limit: 20 })); }, [dispatch]);

  return (
    <DashboardLayout role="driver" title="Orders">
      <div className="card">
        {loading ? <LoadingSpinner text="Loading..." /> : orders.length === 0 ? (
          <EmptyState icon={Package} title="No orders yet" description="Available orders will appear on your dashboard." />
        ) : (
          <div className="divide-y divide-gray-50">
            {orders?.map((order) => (
              <Link key={order?.id} href={`/driver/orders/${order?.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{order.dropAddress}</p>
                  <p className="text-xs text-gray-400">{order.distance?.toFixed(1)} km • {order.estimatedTime} mins</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} />
                  <p className="text-sm font-semibold text-green-700 mt-1">₹{order.deliveryFee?.toFixed(0)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
