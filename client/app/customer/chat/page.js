// 'use client';
// import { useRequireAuth } from '../../../components/shared/AuthGuard';
// import { DashboardLayout } from '../../../components/shared/Layout';
// import { EmptyState } from '../../../components/ui';
// import { MessageSquare } from 'lucide-react';
// import Link from 'next/link';

// export default function ChatPage() {
//   useRequireAuth('customer');
//   return (
//     <DashboardLayout role="customer" title="Messages">
//       <EmptyState icon={MessageSquare} title="No active chats"
//         description="Chat with your driver is available on the order detail page during an active delivery."
//         action={<Link href="/customer/orders" className="btn-primary">View Orders</Link>} />
//     </DashboardLayout>
//   );
// }



'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Package, ChevronRight } from 'lucide-react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, EmptyState } from '../../../components/ui';
import { chatService } from '../../../services/index';
import { formatDistanceToNow } from 'date-fns';

export default function CustomerChatPage() {
  useRequireAuth('customer');
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    chatService.getConversations()
      .then(res => setConversations(res.data.data.conversations))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="customer" title="Messages">
      <div className="max-w-2xl">
        {loading ? (
          <LoadingSpinner text="Loading conversations..." />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Chat with your driver is available during an active delivery. Place an order to get started."
          />
        ) : (
          <div className="card divide-y divide-gray-50">
            {conversations.map((conv) => {
              const lastMsg  = conv.messages?.[0];
              const driver   = conv.driver?.user;
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/customer/orders/${conv.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
                    {driver?.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {driver?.name || 'Driver'} — #{conv.orderNumber}
                      </p>
                      {lastMsg && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg ? lastMsg.message : 'No messages yet'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400 capitalize">{conv.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}