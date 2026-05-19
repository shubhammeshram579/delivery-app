'use client';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { EmptyState } from '../../../components/ui';
import { MessageSquare } from 'lucide-react';

export default function DriverChatPage() {
  useRequireAuth('driver');
  return (
    <DashboardLayout role="driver" title="Messages">
      <EmptyState icon={MessageSquare} title="No active chats"
        description="Chat with customers is available on the active order page." />
    </DashboardLayout>
  );
}
