'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatCard, LoadingSpinner, EmptyState } from '../../../components/ui';
import { driverService } from '../../../services';
import { Wallet, Package, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

export default function EarningsPage() {
  useRequireAuth('driver');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    driverService.getEarnings()
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout role="driver" title="Earnings"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="driver" title="Earnings">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Earned" value={`₹${(data?.total || 0).toFixed(0)}`} icon={Wallet} color="green" />
        <StatCard title="This Month" value={`₹${(data?.thisMonth || 0).toFixed(0)}`} icon={IndianRupee} color="blue" />
        <StatCard title="Deliveries" value={data?.recent?.length || 0} icon={Package} color="purple" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Earnings</h3>
        </div>
        {(!data?.recent || data.recent.length === 0) ? (
          <EmptyState title="No earnings yet" description="Complete deliveries to see your earnings here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Delivery Earning</p>
                  <p className="text-xs text-gray-400">{format(new Date(e.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">+₹{e.netEarning?.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Fee: ₹{e.amount?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
