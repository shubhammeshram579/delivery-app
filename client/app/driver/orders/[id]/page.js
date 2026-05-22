'use client';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import { fetchOrderById, selectCurrentOrder } from '../../../../redux/slices/orderSlice';
import { selectUser } from '../../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../../components/shared/Layout';
import { StatusBadge, LoadingSpinner } from '../../../../components/ui';
import { useSocket } from '../../../../hooks/useSocket';
import { orderService, chatService } from '../../../../services/index';
import toast from 'react-hot-toast';

export default function DriverOrderDetailPage() {
  useRequireAuth('driver');
  const { id }   = useParams();
  const dispatch = useDispatch();
  const router   = useRouter();
  const order    = useSelector(selectCurrentOrder);
  const user     = useSelector(selectUser);

  const { joinOrderRoom, sendChatMessage, onChatMessage,leaveOrderRoom } = useSocket();

  const [messages,   setMessages]   = useState([]);
  const [chatInput,  setChatInput]  = useState('');
  const messagesEndRef = useRef(null);

  // ── Load order ─────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  // ── Join order room for live location + chat ───────────
  // useEffect(() => {
  //   if (!order) return;
  //   trackOrder(id);
  // }, [order, id, trackOrder]);

  useEffect(() => {

  if (!order) return;

  joinOrderRoom(id);

  return () => {
    leaveOrderRoom(id);
  };

}, [order, id,joinOrderRoom, leaveOrderRoom]);

  // ── Load chat history from DB ──────────────────────────
  useEffect(() => {
    if (!id) return;
    chatService.getMessages(id)
      .then(res => {
        setMessages(res.data.data.messages);
        chatService.markRead(id).catch(() => {});
      })
      .catch(() => {});
  }, [id, joinOrderRoom,leaveOrderRoom]);

  // ── Real-time new messages via socket ──────────────────
  // useEffect(() => {
  //   const unsub = onChatMessage((msg) => {
  //     setMessages(prev => {
  //       const exists = prev.find(m => m.id === msg.id);
  //       return exists ? prev : [...prev, msg];
  //     });
  //   });
  //   return unsub;
  // }, [onChatMessage]);


//   useEffect(() => {
//   const unsub = onChatMessage((msg) => {

//     setMessages(prev => {
//       const exists = prev.find(m => m.id === msg.id);

//       if (exists) return prev;

//       return [...prev, msg];
//     });

//     // Mark incoming messages as read
//     if (msg.senderId !== user?.id) {
//       chatService.markRead(id).catch(() => {});
//     }

//   });

//   return unsub;

// }, [onChatMessage, id, user]);


useEffect(() => {

  const unsub = onChatMessage((msg) => {

    if (String(msg.orderId) !== String(id)) {
      return;
    }

    setMessages(prev => {
      // const exists = prev.find(m => m.id === msg.id);

      const exists = prev.some(
  m =>
    m.id === msg.id ||
    (
      m.message === msg.message &&
      m.senderId === msg.senderId &&
      new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
    )
);

      if (exists) return prev;

      return [...prev, msg];
    });

    if (msg.senderId !== user?.id) {
      chatService.markRead(id).catch(() => {});
    }

  });

  return unsub;

}, [onChatMessage, id, user]);

  // ── Auto-scroll to latest message ─────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send chat message ──────────────────────────────────
  // const sendMsg = () => {
  //   if (!chatInput.trim()) return;
  //   sendChatMessage(id, chatInput, 'driver');
  //   // Optimistic update using real user.id
  //   setMessages(prev => [
  //     ...prev,
  //     {
  //       id:         `temp-${Date.now()}`,
  //       senderId:   user?.id,
  //       senderRole: 'driver',
  //       message:    chatInput,
  //       createdAt:  new Date(),
  //     },
  //   ]);
  //   setChatInput('');
  // };


  const sendMsg = () => {
  if (!chatInput.trim()) return;

  sendChatMessage(id, chatInput, 'driver');

  setChatInput('');
};

  // ── Order status actions ───────────────────────────────
  const handleAccept = async () => {
    try {
      await orderService.acceptOrder(id);
      toast.success('Order accepted!');
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept');
    }
  };

  const handleStatus = async (status) => {
    try {
      await orderService.updateStatus(id, status);
      toast.success(`Marked as ${status.replace(/_/g, ' ')}`);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update status');
    }
  };

  if (!order) {
    return (
      <DashboardLayout role="driver" title="Order Detail">
        <LoadingSpinner text="Loading order..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="driver" title={`Order #${order.orderNumber}`}>
      <div className="max-w-xl space-y-4">

        {/* Status + Addresses */}
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
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-lg">
              {order.customer?.name?.[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{order.customer?.name}</p>
              
              <a  href={`tel:${order.customer?.phone}`}
                className="text-xs text-primary-600 hover:underline"
              >
                {order.customer?.phone}
              </a>
            </div>
            
             <a href={`tel:${order.customer?.phone}`}
              className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"
            >
              <Phone className="h-4 w-4 text-green-600" />
            </a>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {order.status === 'pending' && (
            <button onClick={handleAccept} className="btn-primary w-full py-3 text-base">
              ✅ Accept Order
            </button>
          )}
          {order.status === 'accepted' && (
            <button
              onClick={() => handleStatus('picked_up')}
              className="btn-primary w-full py-3 text-base"
            >
              📦 Mark as Picked Up
            </button>
          )}
          {order.status === 'picked_up' && (
            <button
              onClick={() => handleStatus('in_transit')}
              className="btn-primary w-full py-3 text-base"
            >
              🚗 Mark In Transit
            </button>
          )}
          {order.status === 'in_transit' && (
            <button
              onClick={() => handleStatus('delivered')}
              className="btn-primary w-full py-3 text-base bg-green-600 hover:bg-green-700"
            >
              ✅ Mark as Delivered
            </button>
          )}
          {order.status === 'delivered' && (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
              <span className="text-green-600 font-medium text-sm">
                ✅ Order delivered successfully
              </span>
            </div>
          )}
        </div>

        {/* Chat with customer */}
        {['accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Chat with Customer
            </h3>

            {/* Messages */}
            <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
              {messages.length === 0 ? (
                <p className="text-xs text-gray-400 text-center pt-6">
                  No messages yet. Say hello to the customer!
                </p>
              ) : (
                messages.map((m, i) => {
                  // Driver's own messages go right
                  // const isMe = m.senderRole === 'driver' || m.senderId === user?.id;
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        {m.message}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                // onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMsg();
                    }
                  }}
                placeholder="Type a message..."
                className="input-field flex-1"
              />
              <button
                onClick={sendMsg}
                disabled={!chatInput.trim()}
                className="btn-primary px-3 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}