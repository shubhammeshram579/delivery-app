// 'use client';
// import { useEffect, useRef, useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { useParams, useRouter } from 'next/navigation';
// import { MapPin, MessageSquare, Phone, Send } from 'lucide-react';
// import { fetchOrderById, selectCurrentOrder } from '../../../../redux/slices/orderSlice';
// import { selectUser } from '../../../../redux/slices/authSlice';
// import { useRequireAuth } from '../../../../components/shared/AuthGuard';
// import { DashboardLayout } from '../../../../components/shared/Layout';
// import { StatusBadge, LoadingSpinner } from '../../../../components/ui';
// import { useSocket } from '../../../../hooks/useSocket';
// import { orderService, chatService } from '../../../../services/index';
// import toast from 'react-hot-toast';

// import { Navigation } from 'lucide-react';
// import { useGoogleMaps } from '../../../../hooks';


// export default function DriverOrderDetailPage() {
//   useRequireAuth('driver');
//   const { id }   = useParams();
//   const dispatch = useDispatch();
//   const router   = useRouter();
//   const order    = useSelector(selectCurrentOrder);
//   const user     = useSelector(selectUser);

//   const { joinOrderRoom, sendChatMessage, onChatMessage,leaveOrderRoom ,updateDriverLocation} = useSocket();

//   const [messages,   setMessages]   = useState([]);
//   const [chatInput,  setChatInput]  = useState('');
//   const messagesEndRef = useRef(null);


//   const mapRef = useRef(null);

// const {
//   map,
//   mapLoaded,
//   addMarker,
//   drawRoute
// } = useGoogleMaps(mapRef);




// useEffect(() => {
//   if (!map || !order) return;

//   drawRoute(
//     {
//       lat: order.pickupLat,
//       lng: order.pickupLng,
//     },
//     {
//       lat: order.dropLat,
//       lng: order.dropLng,
//     }
//   );

//   addMarker(
//     order.pickupLat,
//     order.pickupLng,
//     null,
//     'Pickup'
//   );

//   addMarker(
//     order.dropLat,
//     order.dropLng,
//     null,
//     'Drop'
//   );

// }, [map, order]);


// useEffect(() => {

//   if (
//     !order ||
//     ![
//       'accepted',
//       'picked_up',
//       'in_transit'
//     ].includes(order.status)
//   ) return;

//   let watchId;

//   if (navigator.geolocation) {

//     watchId =
//       navigator.geolocation.watchPosition(
//         (position) => {

//           updateDriverLocation({
//             orderId: id,
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//           });

//         },
//         console.error,
//         {
//           enableHighAccuracy: true,
//           maximumAge: 10000,
//           timeout: 10000,
//         }
//       );
//   }

//   return () => {
//     if (watchId) {
//       navigator.geolocation.clearWatch(watchId);
//     }
//   };

// }, [order, id]);

//   // ── Load order ─────────────────────────────────────────
//   useEffect(() => {
//     dispatch(fetchOrderById(id));
//   }, [id, dispatch]);

//   // ── Join order room for live location + chat ───────────
//   // useEffect(() => {
//   //   if (!order) return;
//   //   trackOrder(id);
//   // }, [order, id, trackOrder]);

//   useEffect(() => {

//   if (!order) return;

//   joinOrderRoom(id);

//   return () => {
//     leaveOrderRoom(id);
//   };

// }, [order, id,joinOrderRoom, leaveOrderRoom]);

//   // ── Load chat history from DB ──────────────────────────
//   useEffect(() => {
//     if (!id) return;
//     chatService.getMessages(id)
//       .then(res => {
//         setMessages(res.data.data.messages);
//         chatService.markRead(id).catch(() => {});
//       })
//       .catch(() => {});
//   }, [id, joinOrderRoom,leaveOrderRoom]);

//   // ── Real-time new messages via socket ──────────────────
//   // useEffect(() => {
//   //   const unsub = onChatMessage((msg) => {
//   //     setMessages(prev => {
//   //       const exists = prev.find(m => m.id === msg.id);
//   //       return exists ? prev : [...prev, msg];
//   //     });
//   //   });
//   //   return unsub;
//   // }, [onChatMessage]);


// //   useEffect(() => {
// //   const unsub = onChatMessage((msg) => {

// //     setMessages(prev => {
// //       const exists = prev.find(m => m.id === msg.id);

// //       if (exists) return prev;

// //       return [...prev, msg];
// //     });

// //     // Mark incoming messages as read
// //     if (msg.senderId !== user?.id) {
// //       chatService.markRead(id).catch(() => {});
// //     }

// //   });

// //   return unsub;

// // }, [onChatMessage, id, user]);


// useEffect(() => {

//   const unsub = onChatMessage((msg) => {

//     if (String(msg.orderId) !== String(id)) {
//       return;
//     }

//     setMessages(prev => {
//       // const exists = prev.find(m => m.id === msg.id);

//       const exists = prev.some(
//   m =>
//     m.id === msg.id ||
//     (
//       m.message === msg.message &&
//       m.senderId === msg.senderId &&
//       new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
//     )
// );

//       if (exists) return prev;

//       return [...prev, msg];
//     });

//     if (msg.senderId !== user?.id) {
//       chatService.markRead(id).catch(() => {});
//     }

//   });

//   return unsub;

// }, [onChatMessage, id, user]);

//   // ── Auto-scroll to latest message ─────────────────────
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   // ── Send chat message ──────────────────────────────────
//   // const sendMsg = () => {
//   //   if (!chatInput.trim()) return;
//   //   sendChatMessage(id, chatInput, 'driver');
//   //   // Optimistic update using real user.id
//   //   setMessages(prev => [
//   //     ...prev,
//   //     {
//   //       id:         `temp-${Date.now()}`,
//   //       senderId:   user?.id,
//   //       senderRole: 'driver',
//   //       message:    chatInput,
//   //       createdAt:  new Date(),
//   //     },
//   //   ]);
//   //   setChatInput('');
//   // };


//   const sendMsg = () => {
//   if (!chatInput.trim()) return;

//   sendChatMessage(id, chatInput, 'driver');

//   setChatInput('');
// };

//   // ── Order status actions ───────────────────────────────
//   const handleAccept = async () => {
//     try {
//       await orderService.acceptOrder(id);
//       toast.success('Order accepted!');
//       dispatch(fetchOrderById(id));
//     } catch (e) {
//       toast.error(e.response?.data?.message || 'Failed to accept');
//     }
//   };

//   const handleStatus = async (status) => {
//     try {
//       await orderService.updateStatus(id, status);
//       toast.success(`Marked as ${status.replace(/_/g, ' ')}`);
//       dispatch(fetchOrderById(id));
//     } catch (e) {
//       toast.error(e.response?.data?.message || 'Failed to update status');
//     }
//   };

//   if (!order) {
//     return (
//       <DashboardLayout role="driver" title="Order Detail">
//         <LoadingSpinner text="Loading order..." />
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout role="driver" title={`Order #${order.orderNumber}`}>
//       <div className="max-w-xl space-y-4">

//         {/* Status + Addresses */}
//         <div className="card p-5">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="font-semibold text-gray-800">Order Status</h3>
//             <StatusBadge status={order.status} />
//           </div>
//           <div className="space-y-3">
//             <div className="flex gap-3">
//               <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
//               <div>
//                 <p className="text-xs text-gray-400">Pickup</p>
//                 <p className="text-sm text-gray-700">{order.pickupAddress}</p>
//               </div>
//             </div>
//             <div className="flex gap-3">
//               <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
//               <div>
//                 <p className="text-xs text-gray-400">Drop</p>
//                 <p className="text-sm text-gray-700">{order.dropAddress}</p>
//               </div>
//             </div>
//           </div>
//           <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 text-center text-sm">
//             <div>
//               <p className="text-gray-400 text-xs">Distance</p>
//               <p className="font-semibold">{order.distance?.toFixed(1)} km</p>
//             </div>
//             <div>
//               <p className="text-gray-400 text-xs">ETA</p>
//               <p className="font-semibold">{order.estimatedTime} min</p>
//             </div>
//             <div>
//               <p className="text-gray-400 text-xs">Earning</p>
//               <p className="font-semibold text-green-600">
//                 ₹{(order.deliveryFee * 0.85).toFixed(0)}
//               </p>
//             </div>
//           </div>
//         </div>


//         <div className="card overflow-hidden">
//   <div
//     ref={mapRef}
//     className="w-full h-[300px]"
//   />

//   {!mapLoaded && (
//     <div className="p-4">
//       Loading map...
//     </div>
//   )}

//   <div className="p-4 border-t">
//     <a
//       target="_blank"
//       href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropLat},${order.dropLng}`}
//       className="btn-primary w-full flex items-center justify-center gap-2"
//     >
//       <Navigation className="w-4 h-4" />
//       Open Navigation
//     </a>
//   </div>
// </div>


// {order.deliveryInstructions && (
//   <div className="card p-5">
//     <h3 className="font-semibold mb-2">
//       Delivery Instructions
//     </h3>

//     <p className="text-sm text-gray-600">
//       {order.deliveryInstructions}
//     </p>
//   </div>
// )}

//         {/* Customer info */}
//         <div className="card p-5">
//           <h3 className="font-semibold text-gray-800 mb-3">Customer</h3>
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-lg">
//               {order.customer?.name?.[0]}
//             </div>
//             <div className="flex-1">
//               <p className="text-sm font-medium text-gray-900">{order.customer?.name}</p>
              
//               <a  href={`tel:${order.customer?.phone}`}
//                 className="text-xs text-primary-600 hover:underline"
//               >
//                 {order.customer?.phone}
//               </a>
//             </div>
            
//              <a href={`tel:${order.customer?.phone}`}
//               className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"
//             >
//               <Phone className="h-4 w-4 text-green-600" />
//             </a>
//           </div>
//         </div>

//         {/* Action buttons */}
//         <div className="space-y-3">
//           {order.status === 'pending' && (
//             <button onClick={handleAccept} className="btn-primary w-full py-3 text-base">
//               ✅ Accept Order
//             </button>
//           )}
//           {order.status === 'accepted' && (
//             <button
//               onClick={() => handleStatus('picked_up')}
//               className="btn-primary w-full py-3 text-base"
//             >
//               📦 Mark as Picked Up
//             </button>
//           )}
//           {order.status === 'picked_up' && (
//             <button
//               onClick={() => handleStatus('in_transit')}
//               className="btn-primary w-full py-3 text-base"
//             >
//               🚗 Mark In Transit
//             </button>
//           )}
//           {order.status === 'in_transit' && (
//             <button
//               onClick={() => handleStatus('delivered')}
//               className="btn-primary w-full py-3 text-base bg-green-600 hover:bg-green-700"
//             >
//               ✅ Mark as Delivered
//             </button>
//           )}
//           {order.status === 'delivered' && (
//             <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
//               <span className="text-green-600 font-medium text-sm">
//                 ✅ Order delivered successfully
//               </span>
//             </div>
//           )}
//         </div>

//         {/* Chat with customer */}
//         {['accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) && (
//           <div className="card p-5">
//             <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//               <MessageSquare className="h-4 w-4 text-gray-400" />
//               Chat with Customer
//             </h3>

//             {/* Messages */}
//             <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
//               {messages.length === 0 ? (
//                 <p className="text-xs text-gray-400 text-center pt-6">
//                   No messages yet. Say hello to the customer!
//                 </p>
//               ) : (
//                 messages.map((m, i) => {
//                   // Driver's own messages go right
//                   // const isMe = m.senderRole === 'driver' || m.senderId === user?.id;
//                   const isMe = m.senderId === user?.id;
//                   return (
//                     <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
//                       <div
//                         className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
//                           isMe
//                             ? 'bg-primary-600 text-white rounded-br-sm'
//                             : 'bg-gray-100 text-gray-800 rounded-bl-sm'
//                         }`}
//                       >
//                         {m.message}
//                         <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
//                           {new Date(m.createdAt).toLocaleTimeString('en-IN', {
//                             hour: '2-digit',
//                             minute: '2-digit',
//                           })}
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//               {/* Auto-scroll anchor */}
//               <div ref={messagesEndRef} />
//             </div>

//             {/* Input */}
//             <div className="flex gap-2">
//               <input
//                 value={chatInput}
//                 onChange={(e) => setChatInput(e.target.value)}
//                 // onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
//                 onKeyDown={(e) => {
//                     if (e.key === 'Enter' && !e.shiftKey) {
//                       e.preventDefault();
//                       sendMsg();
//                     }
//                   }}
//                 placeholder="Type a message..."
//                 className="input-field flex-1"
//               />
//               <button
//                 onClick={sendMsg}
//                 disabled={!chatInput.trim()}
//                 className="btn-primary px-3 disabled:opacity-50"
//               >
//                 <Send className="h-4 w-4" />
//               </button>
//             </div>
//           </div>
//         )}

//       </div>
//     </DashboardLayout>
//   );
// }


'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, MessageSquare, Phone, Send,
  Navigation, Camera, Banknote, CheckCircle,
  KeyRound, Upload, IndianRupee, Clock,
} from 'lucide-react';
import { fetchOrderById, selectCurrentOrder } from '../../../../redux/slices/orderSlice';
import { selectUser } from '../../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../../components/shared/Layout';
import { StatusBadge, LoadingSpinner } from '../../../../components/ui';
import { useSocket } from '../../../../hooks/useSocket';
import { useGeolocation } from '../../../../hooks';
import { orderService, chatService } from '../../../../services/index';
import toast from 'react-hot-toast';

// ── Google Maps helpers ────────────────────────────────────
const openGoogleMapsNavigation = (destLat, destLng, label = 'Destination') => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  window.open(url, '_blank');
};

// Status flow config
const STATUS_ACTIONS = {
  accepted:   { label: '📦 Mark as Picked Up',   next: 'picked_up'  },
  picked_up:  { label: '🚗 Mark In Transit',      next: 'in_transit' },
  in_transit: { label: '✅ Mark as Delivered',    next: 'delivered'  },
};

export default function DriverOrderDetailPage() {
  useRequireAuth('driver');
  const { id }   = useParams();
  const dispatch = useDispatch();
  const order    = useSelector(selectCurrentOrder);
  const user     = useSelector(selectUser);
  const { location } = useGeolocation(true); // watch GPS

  const { joinOrderRoom, leaveOrderRoom, sendChatMessage, onChatMessage, updateLocation } = useSocket();

  // Chat state
  const [messages,  setMessages]  = useState([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);

  // Map state
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef= useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput,     setOtpInput]     = useState('');
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [otpSent,      setOtpSent]      = useState(false);

  // Proof photo state
  const [showProofModal,  setShowProofModal]  = useState(false);
  const [proofFile,       setProofFile]       = useState(null);
  const [proofPreview,    setProofPreview]    = useState(null);
  const [proofLoading,    setProofLoading]    = useState(false);

  // Cash collection state
  const [cashLoading, setCashLoading] = useState(false);

  // Status update loading
  const [statusLoading, setStatusLoading] = useState(false);

  // ── Load order ─────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  // ── Join socket room ───────────────────────────────────
  useEffect(() => {
    if (!order) return;
    joinOrderRoom(id);
    return () => leaveOrderRoom(id);
  }, [order, id, joinOrderRoom, leaveOrderRoom]);

  // ── Send GPS location updates every 5s ────────────────
  useEffect(() => {
    if (!location || !order) return;
    if (!['accepted', 'picked_up', 'in_transit'].includes(order?.status)) return;
    updateLocation(location.lat, location.lng, id);
  }, [location, order, id, updateLocation]);

  // ── Init Google Map ────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !order) return;

    const initMap = () => {
      const center = { lat: order.pickupLat, lng: order.pickupLng };
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13, center,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
      });
      mapInstanceRef.current = map;

      // Pickup marker (green)
      new window.google.maps.Marker({
        position: { lat: order.pickupLat, lng: order.pickupLng },
        map, title: 'Pickup',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      });

      // Drop marker (red)
      new window.google.maps.Marker({
        position: { lat: order.dropLat, lng: order.dropLng },
        map, title: 'Drop',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      });

      // Draw route
      const directionsService  = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#0284c7', strokeWeight: 4 },
      });
      directionsRenderer.setMap(map);
      directionsService.route({
        origin:      { lat: order.pickupLat, lng: order.pickupLng },
        destination: { lat: order.dropLat,   lng: order.dropLng   },
        travelMode:  window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result);
      });

      setMapReady(true);
    };

    if (window.google?.maps) {
      initMap();
    } else if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [order]);

  // ── Update driver marker on map from GPS ───────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return;
    if (driverMarkerRef.current) driverMarkerRef.current.setMap(null);
    driverMarkerRef.current = new window.google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: mapInstanceRef.current,
      title: 'You',
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
    });
  }, [location]);

  // ── Chat history ───────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    chatService.getMessages(id)
      .then(res => {
        setMessages(res.data.data.messages);
        chatService.markRead(id).catch(() => {});
      })
      .catch(() => {});
  }, [id]);

  // ── Real-time chat ─────────────────────────────────────
  useEffect(() => {
    const unsub = onChatMessage((msg) => {
      if (String(msg.orderId) !== String(id)) return;
      setMessages(prev => {
        const exists = prev.some(m =>
          m.id === msg.id ||
          (m.message === msg.message && m.senderId === msg.senderId &&
           new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime())
        );
        return exists ? prev : [...prev, msg];
      });
      if (msg.senderId !== user?.id) chatService.markRead(id).catch(() => {});
    });
    return unsub;
  }, [onChatMessage, id, user]);

  // ── Auto-scroll chat ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(id, chatInput, 'driver');
    setChatInput('');
  };

  // ── Accept order ───────────────────────────────────────
  const handleAccept = async () => {
    try {
      setStatusLoading(true);
      await orderService.acceptOrder(id);
      toast.success('Order accepted!');
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Update status ──────────────────────────────────────
  const handleStatus = async (status) => {
    try {
      setStatusLoading(true);
      await orderService.updateStatus(id, status);
      toast.success(`Marked as ${status.replace(/_/g, ' ')}`);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Send pickup OTP to customer ────────────────────────
  const handleSendOtp = async () => {
    try {
      setOtpLoading(true);
      await orderService.generatePickupOtp(id);
      setOtpSent(true);
      toast.success('OTP sent to customer');
    } catch (e) {
      toast.error('Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Verify pickup OTP ──────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    try {
      setOtpLoading(true);
      await orderService.verifyPickupOtp(id, otpInput);
      toast.success('Pickup verified!');
      setShowOtpModal(false);
      setOtpInput('');
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Delivery proof photo ───────────────────────────────
  const handleProofSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleProofSubmit = async () => {
    if (!proofFile) {
      toast.error('Please select a photo');
      return;
    }
    try {
      setProofLoading(true);
      const formData = new FormData();
      formData.append('photo', proofFile);
      await orderService.uploadDeliveryProof(id, formData);
      toast.success('Delivery confirmed!');
      setShowProofModal(false);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to upload proof');
    } finally {
      setProofLoading(false);
    }
  };

  // ── Cash collected ─────────────────────────────────────
  const handleCashCollected = async () => {
    try {
      setCashLoading(true);
      await orderService.markCashCollected(id);
      toast.success('Cash collection confirmed!');
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setCashLoading(false);
    }
  };

  if (!order) {
    return (
      <DashboardLayout role="driver" title="Order Detail">
        <LoadingSpinner text="Loading order..." />
      </DashboardLayout>
    );
  }

  const isCash       = order.paymentMethod === 'cash';
  const cashDone     = order.cashCollected;
  const otpVerified  = order.pickupOtpVerified;
  const activeStatuses = ['accepted', 'picked_up', 'in_transit'];

  return (
    <DashboardLayout role="driver" title={`Order #${order.orderNumber}`}>
      <div className="grid lg:grid-cols-5 gap-5">

        {/* ── Left column ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status + Addresses */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Order Status</h3>
              <StatusBadge status={order.status} />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex gap-3">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm text-gray-700">{order.pickupAddress}</p>
                </div>
                {/* Navigate to pickup */}
                <button
                  onClick={() => openGoogleMapsNavigation(order.pickupLat, order.pickupLng, 'Pickup')}
                  className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"
                  title="Navigate to pickup"
                >
                  <Navigation className="h-3.5 w-3.5 text-blue-600" />
                </button>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Drop</p>
                  <p className="text-sm text-gray-700">{order.dropAddress}</p>
                </div>
                {/* Navigate to drop */}
                <button
                  onClick={() => openGoogleMapsNavigation(order.dropLat, order.dropLng, 'Drop')}
                  className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0"
                  title="Navigate to drop"
                >
                  <Navigation className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center text-xs">
              <div>
                <p className="text-gray-400">Distance</p>
                <p className="font-semibold text-sm">{order.distance?.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-gray-400">ETA</p>
                <p className="font-semibold text-sm">{order.estimatedTime} min</p>
              </div>
              <div>
                <p className="text-gray-400">Earning</p>
                <p className="font-semibold text-sm text-green-600">
                  ₹{(order.deliveryFee * 0.85).toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                {order.customer?.name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{order.customer?.name}</p>
                <a href={`tel:${order.customer?.phone}`} className="text-xs text-primary-600 hover:underline">
                  {order.customer?.phone}
                </a>
              </div>
              <a href={`tel:${order.customer?.phone}`} className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="h-4 w-4 text-green-600" />
              </a>
            </div>

            {/* Payment method badge */}
            <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              isCash ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {isCash
                ? <><Banknote className="h-3.5 w-3.5" /> Cash on Delivery</>
                : <><IndianRupee className="h-3.5 w-3.5" /> Online Payment</>
              }
              {isCash && cashDone && (
                <span className="ml-auto flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Collected
                </span>
              )}
            </div>
          </div>

          {/* ── Action Buttons ─────────────────────────── */}
          <div className="space-y-3">

            {/* Accept */}
            {order.status === 'pending' && (
              <button
                onClick={handleAccept}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {statusLoading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Accepting...</>
                  : '✅ Accept Order'
                }
              </button>
            )}

            {/* Pickup OTP verification */}
            {order.status === 'accepted' && !otpVerified && (
              <div className="card p-4 border-l-4 border-l-yellow-400">
                <p className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-yellow-500" />
                  Verify Pickup with OTP
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Send OTP to customer and verify before picking up the package.
                </p>
                <button
                  onClick={() => setShowOtpModal(true)}
                  className="btn-secondary w-full text-sm py-2"
                >
                  Send & Verify OTP
                </button>
              </div>
            )}

            {/* Mark picked up — only after OTP verified */}
            {order.status === 'accepted' && otpVerified && (
              <button
                onClick={() => handleStatus('picked_up')}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {statusLoading ? 'Updating...' : '📦 Mark as Picked Up'}
              </button>
            )}

            {/* In transit */}
            {order.status === 'picked_up' && (
              <button
                onClick={() => handleStatus('in_transit')}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {statusLoading ? 'Updating...' : '🚗 Mark In Transit'}
              </button>
            )}

            {/* Delivered — requires proof photo */}
            {order.status === 'in_transit' && (
              <button
                onClick={() => setShowProofModal(true)}
                className="w-full py-3 text-base bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="h-4 w-4" />
                Upload Proof & Mark Delivered
              </button>
            )}

            {/* Cash collection button */}
            {isCash && !cashDone && ['in_transit', 'delivered'].includes(order.status) && (
              <button
                onClick={handleCashCollected}
                disabled={cashLoading}
                className="w-full py-3 text-base bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {cashLoading
                  ? 'Confirming...'
                  : <><Banknote className="h-4 w-4" /> Confirm Cash Collected</>
                }
              </button>
            )}

            {/* Delivered success */}
            {order.status === 'delivered' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium text-sm">
                  Order delivered successfully
                </span>
              </div>
            )}

          </div>

          {/* Chat */}
          {activeStatuses.includes(order.status) && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                Chat with Customer
              </h3>
              <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center pt-6">No messages yet</p>
                ) : messages.map((m, i) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                        isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.message}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                />
                <button onClick={sendMsg} disabled={!chatInput.trim()} className="btn-primary px-3 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — Map ───────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card overflow-hidden" style={{ height: '480px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Route Map</h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Pickup
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Drop
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> You
                </span>
              </div>
            </div>
            <div ref={mapRef} style={{ height: 'calc(100% - 45px)' }} className="w-full">
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 gap-3">
                  <MapPin className="h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-400">Google Maps not configured</p>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-2">Navigate manually:</p>
                    <button
                      onClick={() => openGoogleMapsNavigation(order.pickupLat, order.pickupLng)}
                      className="btn-secondary text-xs py-1.5 px-3 mb-2 block mx-auto"
                    >
                      Open Pickup in Maps
                    </button>
                    <button
                      onClick={() => openGoogleMapsNavigation(order.dropLat, order.dropLng)}
                      className="btn-primary text-xs py-1.5 px-3 block mx-auto"
                    >
                      Open Drop in Maps
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GPS status */}
          {location && (
            <div className="card p-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-gray-600">
                GPS active — sharing location with customer
              </p>
              <span className="ml-auto text-xs text-gray-400">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── OTP Modal ──────────────────────────────────────── */}
      {showOtpModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowOtpModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-yellow-500" /> Pickup OTP Verification
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ask the customer for the OTP sent to their email/phone
              </p>
            </div>
            <div className="p-5 space-y-4">
              {!otpSent ? (
                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="btn-primary w-full"
                >
                  {otpLoading ? 'Sending...' : 'Send OTP to Customer'}
                </button>
              ) : (
                <>
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> OTP sent to customer
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Enter OTP from customer
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit OTP"
                      className="input-field text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpInput.length !== 6}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify & Confirm Pickup'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Delivery Proof Modal ───────────────────────────── */}
      {showProofModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowProofModal(false); setProofFile(null); setProofPreview(null); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary-600" /> Upload Delivery Proof
              </h3>
              <p className="text-xs text-gray-500 mt-1">Take a photo of the delivered package</p>
            </div>
            <div className="p-5 space-y-4">
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" capture="environment" onChange={handleProofSelect} className="sr-only" />
                {proofPreview ? (
                  <div className="relative">
                    <img src={proofPreview} alt="Proof" className="w-full h-48 object-cover rounded-xl" />
                    <p className="text-xs text-center text-primary-600 mt-2">Tap to change photo</p>
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 transition-colors">
                    <Camera className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">Tap to take/select photo</p>
                  </div>
                )}
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowProofModal(false); setProofFile(null); setProofPreview(null); }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProofSubmit}
                  disabled={!proofFile || proofLoading}
                  className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {proofLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                    : <><Upload className="h-4 w-4" /> Confirm Delivery</>
                  }
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </DashboardLayout>
  );
}