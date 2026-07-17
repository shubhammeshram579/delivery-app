'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { StatCard, LoadingSpinner } from '../../../components/ui';
import { adminService } from '../../../services';
import { Package, Users, Truck, IndianRupee, AlertCircle, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { isAuthenticated, isInitialized } =  useRequireAuth('admin');
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, revRes] = await Promise.all([
          adminService.getDashboard(),
          adminService.getRevenueAnalytics(30),
        ]);
        setStats(statsRes.data.data);
        setRevenue(revRes.data.data.map((d) => ({
          ...d,
          date: format(new Date(d.date), 'dd MMM'),
          revenue: parseFloat(d.revenue),
          count: parseInt(d.count),
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

     // KEY: show spinner while auth check is in progress
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) return <DashboardLayout role="admin" title="Dashboard"><LoadingSpinner text="Loading..." /></DashboardLayout>;

  return (
    <DashboardLayout role="admin" title="Admin Dashboard">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Customers" value={stats?.totalUsers?.toLocaleString()} icon={Users} color="blue" />
        <StatCard title="Total Drivers" value={stats?.totalDrivers?.toLocaleString()} icon={Truck} color="purple" />
        <StatCard title="Total Orders" value={stats?.totalOrders?.toLocaleString()} icon={Package} color="orange" />
        <StatCard title="Active Orders" value={stats?.activeOrders} icon={TrendingUp} color="green" />
        <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={IndianRupee} color="green" />
        <StatCard title="Pending Verifications" value={stats?.pendingDriverVerification} icon={AlertCircle} color="red" />
      </div>

      {/* Revenue chart */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-5">Revenue — Last 30 days</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-5">Orders per day</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue.slice(-7)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
