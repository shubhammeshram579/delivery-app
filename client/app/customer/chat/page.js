'use client';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { EmptyState } from '../../../components/ui';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  useRequireAuth('customer');
  return (
    <DashboardLayout role="customer" title="Messages">
      <EmptyState icon={MessageSquare} title="No active chats"
        description="Chat with your driver is available on the order detail page during an active delivery."
        action={<Link href="/customer/orders" className="btn-primary">View Orders</Link>} />
    </DashboardLayout>
  );
}
