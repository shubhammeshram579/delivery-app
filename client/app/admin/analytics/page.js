'use client';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { EmptyState } from '../../../components/ui';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  useRequireAuth('admin');
  return (
    <DashboardLayout role="admin" title="Analytics">
      <EmptyState icon={TrendingUp} title="Full analytics on Dashboard"
        description="Revenue charts and order statistics are available on the main dashboard."
        action={<Link href="/admin/dashboard" className="btn-primary">Go to Dashboard</Link>} />
    </DashboardLayout>
  );
}
