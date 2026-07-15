'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, selectOrders } from '../../../redux/slices/orderSlice';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatCard, StatusBadge, EmptyState, LoadingSpinner } from '../../../components/ui';
import { driverService } from '../../../services/index';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { useSocket } from '../../../hooks/useSocket';
import { useGeolocation } from '../../../hooks';
import { Package, Wallet, Star, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { useOrderOffers } from '../../../hooks/useOrderOffers';
import {OrderOfferModal} from '../../../components/OrderOfferModal';

export default function DriverDashboard() {
 const { isAuthenticated, isInitialized } =  useRequireAuth('driver');
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);
  const [profile, setProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [toggling, setToggling] = useState(false);
  const { goOnline, updateLocation } = useSocket();
  const { location } = useGeolocation(isAvailable); // watch when available
  // Inside component
const { activeOffer, timeLeft, accept, reject } = useOrderOffers();

 

  // Send location updates every 5 seconds when on duty
  useEffect(() => {
    if (!isAvailable || !location) return;
    const activeOrder = orders.find((o) => ['accepted', 'picked_up', 'in_transit'].includes(o.status));
    updateLocation(location.lat, location.lng, activeOrder?.id);
  }, [location, isAvailable]);

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, earnRes] = await Promise.all([driverService.getProfile(), driverService.getEarnings()]);
        const d = profRes.data.data.driver;
        setProfile(d);
        setIsAvailable(d.isAvailable);
        setEarnings(earnRes.data.data);
      } catch (err) { console.error(err); }
    };
    load();
    dispatch(fetchOrders({ status: 'pending', limit: 10 }));
  }, [dispatch]);



  const toggleAvailability = async () => {
    setToggling(true);
    try {
      await driverService.toggleAvailability(!isAvailable);
      setIsAvailable((v) => !v);
      if (!isAvailable) { goOnline(); toast.success('You are now online'); }
      else toast('You are now offline');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const activeOrder = orders.find((o) => ['accepted', 'picked_up', 'in_transit'].includes(o.status));

     // KEY: show spinner while auth check is in progress
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <DashboardLayout role="driver" title="Driver Dashboard">
      {/* Availability toggle */}
      <div className={`rounded-xl p-5 mb-6 flex items-center justify-between transition-colors ${isAvailable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div>
          <p className="font-semibold text-gray-900">{isAvailable ? '🟢 You are Online' : '⚫ You are Offline'}</p>
          <p className="text-sm text-gray-500 mt-0.5">{isAvailable ? 'You will receive new order requests' : 'Go online to accept deliveries'}</p>
        </div>
        <button onClick={toggleAvailability} disabled={toggling} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          {toggling ? <LoadingSpinner size="sm" /> : isAvailable ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
          {isAvailable ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* accept offer  */}
      {activeOffer && (
        <OrderOfferModal offer={activeOffer} timeLeft={timeLeft} onAccept={accept} onReject={reject} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Earnings" value={`₹${earnings?.thisMonth?.toFixed(0) || 0}`} icon={Wallet} color="green" />
        <StatCard title="Total Deliveries" value={profile?.totalDeliveries || 0} icon={Package} color="blue" />
        <StatCard title="Rating" value={`${profile?.rating?.toFixed(1) || '—'} ★`} icon={Star} color="orange" />
        <StatCard title="Total Earned" value={`₹${earnings?.total?.toFixed(0) || 0}`} icon={Wallet} color="purple" />
      </div>

      {/* Active order */}
      {activeOrder && (
        <div className="card p-5 mb-6 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Active Delivery</h3>
            <StatusBadge status={activeOrder.status} />
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600">{activeOrder.pickupAddress}</p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600">{activeOrder.dropAddress}</p>
            </div>
          </div>
          <Link href={`/driver/orders/${activeOrder.id}`} className="btn-primary w-full text-center block">
            Continue Delivery
          </Link>
        </div>
      )}

      {/* Pending orders pool */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Available Orders</h3>
        </div>
        {orders.filter((o) => o.status === 'pending').length === 0 ? (
          <EmptyState title="No orders right now" description="New orders will appear here when customers place them." />
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.filter((o) => o.status === 'pending').map((order) => (
              <Link key={order.id} href={`/driver/orders/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{order.distance?.toFixed(1)} km • {order.estimatedTime} mins</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">₹{order.deliveryFee?.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">Earning</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
