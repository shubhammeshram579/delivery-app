'use client';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { EmptyState } from '../../../components/ui';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

export default function TrackPage() {
  useRequireAuth('customer');
  return (
    <DashboardLayout role="customer" title="Track Order">
      <EmptyState icon={MapPin} title="No active delivery"
        description="Real-time tracking is available on the order detail page when your order is in transit."
        action={<Link href="/customer/orders" className="btn-primary">My Orders</Link>} />
    </DashboardLayout>
  );
}
