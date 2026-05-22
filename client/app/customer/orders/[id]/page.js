'use client';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'next/navigation';
import {
  MapPin, MessageSquare, Phone, Send,
  IndianRupee, X, AlertTriangle,
  CheckCircle, Clock, XCircle,
} from 'lucide-react';
import { fetchOrderById, selectCurrentOrder, selectDriverLocation } from '../../../../redux/slices/orderSlice';
import { orderService, chatService  } from '../../../../services/index';
import { selectUser } from '../../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../../components/shared/Layout';
import { StatusBadge, LoadingSpinner } from '../../../../components/ui';
import { useSocket } from '../../../../hooks/useSocket';
import { useGoogleMaps } from '../../../../hooks';
import { useRazorpay } from '../../../../hooks/useRazorpay';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  useRequireAuth('customer');
  const messagesEndRef = useRef(null);
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const order      = useSelector(selectCurrentOrder);
  const user       = useSelector(selectUser);
  const driverLocation = useSelector(selectDriverLocation);

  const { trackOrder, sendChatMessage, onChatMessage,joinOrderRoom,leaveOrderRoom } = useSocket();
  const { openPayment, loading: payLoading } = useRazorpay();

  const [messages, setMessages]           = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [paid, setPaid]                   = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason]   = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const { map, mapLoaded, addMarker, drawRoute } = useGoogleMaps(mapRef);


  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

  // ── Load order ────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  // ── Track driver location ─────────────────────────────────
  // useEffect(() => {
  //   if (order && ['accepted', 'picked_up', 'in_transit'].includes(order.status)) {
  //     trackOrder(id);
  //   }
  // }, [order, id, trackOrder]);

//   useEffect(() => {
//   if (!order || !['accepted', 'picked_up', 'in_transit'].includes(order.status)) {
//     return;
//   }

//   const cleanup = trackOrder(id);

//   return () => {
//     if (cleanup) cleanup();
//   };

// }, [order, id, trackOrder]);


useEffect(() => {
  if (!order || !['accepted', 'picked_up', 'in_transit'].includes(order.status)) return;

  joinOrderRoom(id);

   return () => {
    leaveOrderRoom(id);
  };

}, [order, id,joinOrderRoom,leaveOrderRoom]);

  // ── Set paid state from order data ────────────────────────
  useEffect(() => {
    if (order?.payment?.status === 'success') setPaid(true);
  }, [order]);

  // ── Chat listener ─────────────────────────────────────────
  // useEffect(() => {
  //   const unsub = onChatMessage((msg) => {
  //     setMessages((prev) => [...prev, msg]);
  //   });
  //   return unsub;
  // }, [onChatMessage]);


  // Load existing messages from DB on mount
useEffect(() => {
  if (!id) return;
  chatService.getMessages(id)
    .then(res => {
      setMessages(res.data.data.messages);
      // Mark as read
      chatService.markRead(id).catch(() => {});
    })
    .catch(() => {}); // Ignore if no messages yet
}, [id,joinOrderRoom,leaveOrderRoom]);

// // Listen for new real-time messages via socket
// useEffect(() => {
//   const unsub = onChatMessage((msg) => {
//     setMessages(prev => {
//       // Avoid duplicates
//       const exists = prev.find(m => m.id === msg.id);
//       return exists ? prev : [...prev, msg];
//     });
//   });
//   return unsub;
// }, [onChatMessage]);


// useEffect(() => {
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


// useEffect(() => {

//   const unsub = onChatMessage((msg) => {

//     if (String(msg.orderId) !== String(id)) {
//       return;
//     }

//     setMessages(prev => {
//       const exists = prev.find(m => m.id === msg.id);

//       if (exists) return prev;

//       return [...prev, msg];
//     });

//     if (msg.senderId !== user?.id) {
//       chatService.markRead(id).catch(() => {});
//     }

//   });

//   return unsub;

// }, [onChatMessage, id, user]);

  // ── Driver marker on map ──────────────────────────────────
  useEffect(() => {
    if (!map || !driverLocation) return;
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = addMarker(driverLocation.lat, driverLocation.lng, null, 'Driver');
    map.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
  }, [driverLocation, map]);

  // ── Draw route on map ─────────────────────────────────────
  useEffect(() => {
    if (!map || !order) return;
    drawRoute(
      { lat: order.pickupLat, lng: order.pickupLng },
      { lat: order.dropLat,   lng: order.dropLng   }
    );
    addMarker(order.pickupLat, order.pickupLng, null, 'Pickup');
    addMarker(order.dropLat,   order.dropLng,   null, 'Drop');
  }, [map, order]);

  // ── Chat send ─────────────────────────────────────────────
  // const sendMsg = () => {
  //   if (!chatInput.trim()) return;
  //   sendChatMessage(id, chatInput, 'customer');
  //   setMessages((prev) => [
  //     ...prev,
  //     { senderId: 'me', message: chatInput, senderRole: 'customer', createdAt: new Date() },
  //   ]);
  //   setChatInput('');
  // };

//   const sendMsg = () => {
//   if (!chatInput.trim()) return;
//   sendChatMessage(id, chatInput, 'customer');
//   setMessages((prev) => [
//     ...prev,
//     {
//       id:         `temp-${Date.now()}`,
//       senderId:   user?.id,        // ← was 'me', now real user.id
//       senderRole: 'customer',
//       message:    chatInput,
//       createdAt:  new Date(),
//     },
//   ]);
//   setChatInput('');
// };

// const sendMsg = () => {
//   if (!chatInput.trim()) return;

//   sendChatMessage(id, chatInput, 'customer');

//   setChatInput('');
// };

const sendMsg = () => {
  if (!chatInput.trim()) return;

  const tempMsg = {
    id: `temp-${Date.now()}`,
    orderId: id,
    senderId: user?.id,
    senderRole: 'customer',
    message: chatInput,
    createdAt: new Date().toISOString(),
  };

  // Optimistic UI
  setMessages(prev => [...prev, tempMsg]);

  // Send socket message
  sendChatMessage(id, chatInput, 'customer');

  setChatInput('');
};


useEffect(() => {

  const unsub = onChatMessage((msg) => {

    if (String(msg.orderId) !== String(id)) {
      return;
    }

    setMessages(prev => {

      const exists = prev.some(
        m =>
          m.id === msg.id ||
          (
            m.message === msg.message &&
            m.senderId === msg.senderId &&
            new Date(m.createdAt).getTime() ===
            new Date(msg.createdAt).getTime()
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


  // ── Pay now ───────────────────────────────────────────────
  const handlePay = () => {
    openPayment({
      orderId:     order.id,
      orderNumber: order.orderNumber,
      amount:      order.totalAmount,
      user,
      onSuccess: () => {
        setPaid(true);
        dispatch(fetchOrderById(id));
      },
    });
  };

  // ── Cancel order ──────────────────────────────────────────
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    try {
      setCancelLoading(true);
      await orderService.cancelOrder(order.id, cancelReason);
      toast.success('Order cancelled successfully');
      dispatch(fetchOrderById(order.id));
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  if (!order) {
    return (
      <DashboardLayout role="customer" title="Order Detail">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const isPaid      = paid || order.payment?.status === 'success';
  const isFailed    = order.payment?.status === 'failed';
  const isCancelled = order.status === 'cancelled';
  const canCancel   = ['pending', 'accepted'].includes(order.status);

  return (
    <DashboardLayout role="customer" title={`Order #${order.orderNumber}`}>
      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left column ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status card */}
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
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="mt-5 w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel Order
              </button>
            )}
          </div>

          {/* ── PAYMENT CARD ─────────────────────────────── */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-gray-400" />
              Payment
            </h3>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Base fare</span>
                <span>₹{order.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery fee</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-100 pt-2 mt-2">
                <span>Total</span>
                <span className="text-base">₹{order.totalAmount}</span>
              </div>
            </div>

            {/* ── Payment status & action ─────────────────── */}
            {isPaid ? (
              // ✅ Already paid
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">Payment Successful</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {order.payment?.paidAt
                      ? `Paid on ${new Date(order.payment.paidAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`
                      : 'Payment confirmed'}
                  </p>
                </div>
              </div>

            ) : isCancelled ? (
              // ❌ Order cancelled
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                Order cancelled — no payment required
              </div>

            ) : isFailed ? (
              // ❌ Payment failed — retry
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">Payment failed. Please retry.</p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {payLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                    : '💳 Retry Payment'
                  }
                </button>
              </div>

            ) : (
              // ⏳ Pending — show Pay Now button
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 font-medium">Payment pending</p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                >
                  {payLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opening payment...</>
                    : <><IndianRupee className="h-4 w-4" /> Pay ₹{order.totalAmount} Now</>
                  }
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Secured by Razorpay · UPI · Cards · Wallets
                </p>
              </div>
            )}
          </div>

          {/* Driver info */}
          {order.driver && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Driver</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                  {order.driver.user?.name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{order.driver.user?.name}</p>
                  <p className="text-xs text-gray-500">⭐ {order.driver.rating?.toFixed(1) || 'New'}</p>
                </div>
                <a href={`tel:${order.driver.user?.phone}`} className="p-2 bg-green-50 rounded-lg">
                  <Phone className="h-4 w-4 text-green-600" />
                </a>
              </div>
            </div>
          )}

          {/* Chat */}
          {order.driver && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" /> Chat with Driver
              </h3>
              {/* <div className="h-40 overflow-y-auto mb-3 space-y-2">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.senderRole === 'customer' || m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${m.senderRole === 'customer' || m.senderId === 'me' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.message}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-4">No messages yet</p>
                )}
              </div> */}

              <div className="h-40 overflow-y-auto mb-3 space-y-2 pr-1">
                {messages.map((m, i) => {
                  // Compare with real user.id — works for both DB messages and optimistic
                  // const isMe = m.senderRole === 'customer' || m.senderId === user?.id;
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.message}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-4">No messages yet</p>
                )}
                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                />
                <button onClick={sendMsg} className="btn-primary px-3">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Right column — Map ────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden relative" style={{ height: '500px' }}>
            <div ref={mapRef} className="w-full h-full" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <LoadingSpinner text="Loading map..." />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Cancel Modal ─────────────────────────────────────── */}
      {showCancelModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Cancel Order</h3>
                  <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Please tell us why you're cancelling..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {['Changed my mind', 'Wrong address', 'Driver taking too long', 'Ordered by mistake'].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t bg-gray-50">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Keep Order
              </button>
              <button
                disabled={cancelLoading}
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </>
      )}

    </DashboardLayout>
  );
}