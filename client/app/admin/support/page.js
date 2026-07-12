'use client';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import AdminSupportDashboard from '../../../components/support/AdminSupportDashboard';

export default function AdminSupportPage() {
  useRequireAuth('admin');
  return (
    <DashboardLayout role="admin" title="Support Center">
      <AdminSupportDashboard />
    </DashboardLayout>
  );
}