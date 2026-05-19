'use client';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'next/navigation';

import { fetchOrderById, selectCurrentOrder } from '../../../../redux/slices/orderSlice';

import { useRequireAuth } from '../../../../components/shared/AuthGuard';

import { DashboardLayout } from '../../../../components/shared/Layout';
import { StatusBadge, LoadingSpinner } from '../../../../components/ui';
import { MapPin } from 'lucide-react';
import { orderService } from '../../../../services/index';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DriverOrderDetailPage() {
  useRequireAuth('driver');
  const { id } = useParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const order = useSelector(selectCurrentOrder);

  console.log("orderService",orderService)

  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  const handleAccept = async () => {
    try {
      await orderService.acceptOrder(id);
      toast.success('Order accepted!');
      router.push('/driver/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept');
    }
  };

  const handleStatus = async (status) => {
    try {
      await orderService.updateStatus(id, status);
      toast.success(`Status updated to ${status}`);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  if (!order) return (
    <DashboardLayout role="driver" title="Order Detail">
      <LoadingSpinner text="Loading order..." />
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="driver" title={`Order #${order.orderNumber}`}>
      <div className="max-w-xl space-y-4">

        {/* Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Order Status</h3>
            <StatusBadge status={order.status} />
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Pickup</p>
                <p className="text-sm text-gray-700">{order.pickupAddress}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Drop</p>
                <p className="text-sm text-gray-700">{order.dropAddress}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 text-center text-sm">
            <div>
              <p className="text-gray-400 text-xs">Distance</p>
              <p className="font-semibold">{order.distance?.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">ETA</p>
              <p className="font-semibold">{order.estimatedTime} min</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Earning</p>
              <p className="font-semibold text-green-600">
                ₹{(order.deliveryFee * 0.85).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Customer</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
              {order.customer?.name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{order.customer?.name}</p>
              <a href={`tel:${order.customer?.phone}`} className="text-xs text-primary-600">
                {order.customer?.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {order.status === 'pending' && (
            <button onClick={handleAccept} className="btn-primary w-full">
              ✅ Accept Order
            </button>
          )}
          {order.status === 'accepted' && (
            <button onClick={() => handleStatus('picked_up')} className="btn-primary w-full">
              📦 Mark as Picked Up
            </button>
          )}
          {order.status === 'picked_up' && (
            <button onClick={() => handleStatus('in_transit')} className="btn-primary w-full">
              🚗 Mark In Transit
            </button>
          )}
          {order.status === 'in_transit' && (
            <button onClick={() => handleStatus('delivered')} className="btn-primary w-full">
              ✅ Mark as Delivered
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}