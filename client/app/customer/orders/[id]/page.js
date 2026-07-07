"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import {
  MapPin,
  MessageSquare,
  Phone,
  Send,
  IndianRupee,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Banknote,
  Navigation,
} from "lucide-react";
import {
  fetchOrderById,
  selectCurrentOrder,
  selectDriverLocation,
  updateDriverLocation,
} from "../../../../redux/slices/orderSlice";
import { selectUser } from "../../../../redux/slices/authSlice";
import { useRequireAuth } from "../../../../components/shared/AuthGuard";
import { DashboardLayout } from "../../../../components/shared/Layout";
import { StatusBadge, LoadingSpinner } from "../../../../components/ui";
import { useSocket } from "../../../../hooks/useSocket";
import { useRazorpay } from "../../../../hooks/useRazorpay";
import { orderService, chatService } from "../../../../services/index";
import toast from "react-hot-toast";
import Image from 'next/image';
import carImage from '../../../../public/car.png';
import AIPriceExplainer from '../../../../components/ai/AIPriceExplainer';


// ── Order timeline steps ───────────────────────────────────
const TIMELINE = [
  { key: "pending",    label: "Booking Created",       field: "createdAt"   },
  { key: "accepted",   label: "Driver Assigned",    field: "acceptedAt"  },
  { key: "picked_up",  label: "Package Picked Up",  field: "pickedUpAt"  },
  { key: "in_transit", label: "In Transit",         field: null          },
  { key: "delivered",  label: "Delivered",          field: "deliveredAt" },
];

const STATUS_ORDER = [
  "pending",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
];



// ── Truck SVG as a compressed single-line Data URI ──────
const TRUCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="22" fill="#0284c7" stroke="white" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🚚</text></svg>`;
const TRUCK_ICON_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TRUCK_ICON_SVG)}`;

// ── Haversine distance in km ───────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Smoothly animate marker from A → B over ~800 ms ───────
function animateMarker(marker, targetLat, targetLng, steps = 60, durationMs = 800) {
  const startPos = marker.getPosition();
  if (!startPos) return;
  const startLat = startPos.lat();
  const startLng = startPos.lng();
  const dLat = targetLat - startLat;
  const dLng = targetLng - startLng;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    const progress = step / steps;
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    marker.setPosition(
      new window.google.maps.LatLng(
        startLat + dLat * eased,
        startLng + dLng * eased
      )
    );
    if (step >= steps) clearInterval(interval);
  }, durationMs / steps);
}

// ── Draw / replace a DirectionsRenderer route ─────────────
function drawRoute(map, origin, destination, rendererRef, color = "#0284c7") {
  if (rendererRef.current) {
    rendererRef.current.setMap(null);
  }
  const dr = new window.google.maps.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: { strokeColor: color, strokeWeight: 4 },
  });
  dr.setMap(map);
  rendererRef.current = dr;

  const ds = new window.google.maps.DirectionsService();
  ds.route(
    {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") dr.setDirections(result);
    }
  );
}

export default function CustomerOrderDetailPage() {
  useRequireAuth("customer");
  const { id } = useParams();
  const dispatch = useDispatch();
  const order   = useSelector(selectCurrentOrder);
  const user    = useSelector(selectUser);
  const driverLocation = useSelector(selectDriverLocation);

  // console.log("driverLocation",driverLocation)

  const { joinOrderRoom, leaveOrderRoom, sendChatMessage, onChatMessage } = useSocket();
  const { openPayment, loading: payLoading } = useRazorpay();

  // ── Chat ────────────────────────────────────────────────
  const [messages, setMessages]   = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef            = useRef(null);

  // ── Payment ─────────────────────────────────────────────
  const [paid, setPaid]           = useState(false);
  const [payMethod, setPayMethod] = useState("online");

  // ── Cancel modal ────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason]       = useState("");
  const [cancelLoading, setCancelLoading]     = useState(false);

  // ── Rating modal ─────────────────────────────────────────
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating]                   = useState(0);
  const [review, setReview]                   = useState("");
  const [ratingLoading, setRatingLoading]     = useState(false);
  const [ratingDone, setRatingDone]           = useState(false);

  // ── Map refs ─────────────────────────────────────────────
  const mapRef            = useRef(null);   // DOM node
  const mapInstanceRef    = useRef(null);   // google.maps.Map
  const driverMarkerRef   = useRef(null);   // driver marker
  const pickupMarkerRef   = useRef(null);   // green pickup marker
  const dropMarkerRef     = useRef(null);   // red drop marker
  const routeRendererRef  = useRef(null);   // active DirectionsRenderer
  const [mapReady, setMapReady] = useState(false);

  // Track previous order status to detect transitions
  const prevStatusRef = useRef(null);

  const isPassenger = order?.orderType === "passenger";

  // ─────────────────────────────────────────────────────────
  // 1. Load order
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  // ─────────────────────────────────────────────────────────
  // 2. Sync payment / rating state from order
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (order?.payment?.status === "success") setPaid(true);
    if (order?.paymentMethod) setPayMethod(order.paymentMethod);
    if (order?.customerRating) setRatingDone(true);
  }, [order]);

  // ─────────────────────────────────────────────────────────
  // 3. Join socket room (once per order id)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    joinOrderRoom(id);
    return () => leaveOrderRoom(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // 4. Fetch initial driver location (only when driver assigned)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !order?.driver) return;           // no driver yet → skip
    const loadInitialLocation = async () => {
      try {
        const res = await orderService.getLiveLocation(id);
        if (res?.data?.data?.lat && res?.data?.data?.lng) {
          dispatch(updateDriverLocation(res.data.data));
        }
      } catch (err) {
        // Driver may not have started broadcasting yet — not an error
        console.warn("[Live Location] Not available yet:", err?.message);
      }
    };
    loadInitialLocation();
  }, [id, order?.driver, dispatch]);

 
  // ─────────────────────────────────────────────────────────
  // 5. Init Google Map (once, when order data is available)
  // ─────────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || !order) return;

    // 👇 ADD THIS CLEANUP SECTION FOR REFRESHES
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
      driverMarkerRef.current = null; // Forces Section 7 to recreate it
    }
    if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
    if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);
    if (routeRendererRef.current) routeRendererRef.current.setMap(null);
    // 👆 END CLEANUP

    const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
    const dropLatLng   = { lat: order.dropLat,   lng: order.dropLng   };

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: pickupLatLng,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    // Pickup marker (green)
    pickupMarkerRef.current = new window.google.maps.Marker({
      position: pickupLatLng,
      map,
      title: "Pickup",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" },
    });

    // Drop marker (red)
    dropMarkerRef.current = new window.google.maps.Marker({
      position: dropLatLng,
      map,
      title: "Drop",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" },
    });

    drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#035efc");

    setMapReady(true);
  }, [order]);

  useEffect(() => {
    if (!order) return;

    if (window.google?.maps) {
      initMap();
    } else {
      // Check if script already exists anywhere in the document
      let script = document.getElementById("gmaps-script");
      
      if (!script) {
        script = document.createElement("script");
        script.id = "gmaps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        // If script is already loaded/loading by another process, just poll for the object
        const check = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(check);
            initMap();
          }
        }, 200);
        return () => clearInterval(check);
      }
    }
  }, [order, initMap]);

  // ─────────────────────────────────────────────────────────
  // 6. React to order STATUS changes → redraw route
  //
  //    Status flow:
  //    pending   → no driver marker, static grey route pickup→drop
  //    accepted  → driver marker appears, live route driver→pickup (orange)
  //    picked_up → live route driver→drop (blue)
  //    in_transit→ live route driver→drop (blue, same as above)
  //    delivered → hide driver marker, show static grey route pickup→drop
  //    cancelled → no driver marker
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !order) return;

    const status = order.status;
    if (prevStatusRef.current === status) return;   // no change
    prevStatusRef.current = status;

    const map          = mapInstanceRef.current;
    const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
    const dropLatLng   = { lat: order.dropLat,   lng: order.dropLng   };

    if (status === "delivered" || status === "cancelled") {
      // Hide driver marker
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
      // Show static route pickup → drop
      drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#94a3b8");

      // Fit map to show full route
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (status === "accepted" && driverLocation) {
      // Draw route: driver → pickup
      const driverLatLng = { lat: driverLocation.lat, lng: driverLocation.lng };
      drawRoute(map, driverLatLng, pickupLatLng, routeRendererRef, "#f97316");

      // Fit map to show driver + pickup
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(driverLatLng);
      bounds.extend(pickupLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (status === "picked_up" || status === "in_transit") {
      // Draw route: pickup → drop (driver is now carrying the package)
      drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#0284c7");

      // Fit map to show pickup + drop
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }
  }, [order?.status, mapReady, driverLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  
  // ─────────────────────────────────────────────────────────
// 7. Live driver marker — update whenever driverLocation or status changes
// ─────────────────────────────────────────────────────────
useEffect(() => {
  if (!mapReady || !mapInstanceRef.current) return;

  // Don't show driver marker if no driver or delivery finished
  const activeStatuses = ["accepted", "picked_up", "in_transit"];
  if (!order?.driver || !activeStatuses.includes(order?.status)) return;

  if (!driverLocation?.lat || !driverLocation?.lng) return;

  const map      = mapInstanceRef.current;
  const position = {
    lat: Number(driverLocation.lat),
    lng: Number(driverLocation.lng),
  };

  if (!driverMarkerRef.current) {
    // First time: create the marker
    driverMarkerRef.current = new window.google.maps.Marker({
      position,
      map,
      title: "Driver",
      icon: {
        url: TRUCK_ICON_URL,
        scaledSize: new window.google.maps.Size(44, 44),
        anchor: new window.google.maps.Point(22, 22),
      },
      zIndex: 9999,
    });

    // First appearance: pan gently to show driver on map
    map.panTo(position);
  } else {
    // Subsequent updates: smooth animated movement
    animateMarker(
      driverMarkerRef.current,
      position.lat,
      position.lng
    );

    // Only pan if driver has moved significantly outside the visible area
    const bounds = map.getBounds();
    if (bounds && !bounds.contains(new window.google.maps.LatLng(position.lat, position.lng))) {
      map.panTo(position);
    }
  }

  // Re-draw live route based on current status
  if (order.status === "accepted") {
    const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
    drawRoute(map, position, pickupLatLng, routeRendererRef, "#f97316");
  }

}, [driverLocation, mapReady, order?.status]); // Added order?.status here!
 

  // ─────────────────────────────────────────────────────────
  // 8. Chat — load history
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    chatService
      .getMessages(id)
      .then((res) => {
        setMessages(res.data.data.messages);
        chatService.markRead(id).catch(() => {});
      })
      .catch(() => {});
  }, [id]);


  // ─────────────────────────────────────────────────────────
  // 10. Auto-scroll chat
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // ─────────────────────────────────────────────────────────
  // 8. Chat — real-time messages (FIXED DEDUPLICATION)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onChatMessage((msg) => {
      if (String(msg.orderId) !== String(id)) return;
      
      setMessages((prev) => {
        // Look for any existing message with the exact same ID
        const existsById = prev.some((m) => m.id === msg.id);
        if (existsById) return prev;

        // CRITICAL FIX: Match and replace optimistic temp items 
        // to prevent duplicate visual flashing on the screen.
        const isOptimisticMatch = prev.some(
          (m) =>
            m.id.toString().startsWith("temp-") &&
            m.message === msg.message &&
            m.senderId === msg.senderId
        );

        if (isOptimisticMatch) {
          // Swap out the temporary placeholder with the permanent database entry cleanly
          return prev.map((m) =>
            m.id.toString().startsWith("temp-") &&
            m.message === msg.message &&
            m.senderId === msg.senderId
              ? msg
              : m
          );
        }

        // Standard append if it's a completely new incoming message from the customer
        return [...prev, msg];
      });

      if (msg.senderId !== user?.id) {
        chatService.markRead(id).catch(() => {});
      }
    });
    
    return unsub;
  }, [onChatMessage, id, user?.id]);


  // ─────────────────────────────────────────────────────────
  // Handlers — sendMsg
  // ─────────────────────────────────────────────────────────
  const sendMsg = () => {
    const trimmedInput = chatInput.trim();
    if (!trimmedInput) return;

    // Optimistic UI — add temporary trace message instantly
    const tempMsg = {
      id: `temp-${Date.now()}`,
      orderId: id,
      senderId: user?.id,
      senderRole: "driver",
      message: trimmedInput,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    
    // Clear input box immediately for high performance feel
    setChatInput("");

    // Emit out to socket channel safely
    sendChatMessage(id, trimmedInput, "customer");
  };

  const handlePayOnline = () => {
    openPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      user,
      onSuccess: () => {
        setPaid(true);
        dispatch(fetchOrderById(id));
      },
    });
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    try {
      setCancelLoading(true);
      await orderService.cancelOrder(order.id, cancelReason);
      toast.success("Order cancelled");
      dispatch(fetchOrderById(order.id));
      setShowCancelModal(false);
      setCancelReason("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRating = async () => {
    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }
    try {
      setRatingLoading(true);
      await orderService.rateOrder(order.id, { rating, review });
      toast.success("Thank you for your review!");
      setShowRatingModal(false);
      setRatingDone(true);
    } catch (e) {
      toast.error("Failed to submit rating");
    } finally {
      setRatingLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────
  if (!order) {
    return (
      <DashboardLayout role="customer" title="Order Detail">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const isCash        = order.paymentMethod === "cash";
  const isPaid        = paid || order.payment?.status === "success" || (isCash && order.cashCollected);
  const isFailed      = order.payment?.status === "failed";
  const isCancelled   = order.status === "cancelled";
  const isDelivered   = order.status === "delivered";
  const canCancel     = ["pending", "accepted"].includes(order.status);
  const currentStep   = STATUS_ORDER.indexOf(order.status);
  const hasDriver     = !!order.driver;

  // Dynamic map header label
  const mapLabel = (() => {
    if (!hasDriver || !driverLocation)        return "Route Map";
    if (order.status === "accepted")          return "🔴 Driver heading to pickup";
    if (order.status === "picked_up")         return "🔴 Driver heading to drop";
    if (order.status === "in_transit")        return "🔴 In transit — live tracking";
    if (order.status === "delivered")         return "✅ Delivered";
    return "Route Map";
  })();

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <DashboardLayout role="customer" title={`Order #${order.orderNumber}`}>
      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left column ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Order Timeline */}
          {!isCancelled && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">{isPassenger ? "Booking Progress": "Order Progress" }</h3>
              <div className="space-y-3">
                {TIMELINE.map((step, i) => {
                  const done    = i <= currentStep;
                  const current = i === currentStep;
                  const ts      = step.field ? order[step.field] : null;
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                            done
                              ? "bg-primary-600 border-primary-600"
                              : "bg-white border-gray-200"
                          } ${current ? "ring-4 ring-primary-100" : ""}`}
                        >
                          {done ? (
                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          )}
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <div
                            className={`w-0.5 h-6 mt-1 ${i < currentStep ? "bg-primary-400" : "bg-gray-200"}`}
                          />
                        )}
                      </div>
                      <div className="pb-1">
                        <p className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        {ts && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(ts).toLocaleString("en-IN", {
                              day: "2-digit", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled banner */}
          {isCancelled && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Order Cancelled</p>
                {order.cancelReason && (
                  <p className="text-xs text-red-500 mt-0.5">{order.cancelReason}</p>
                )}
              </div>
            </div>
          )}

          {/* Addresses */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Delivery Details</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm text-gray-800">{order.pickupAddress}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Drop</p>
                  <p className="text-sm text-gray-800">{order.dropAddress}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
              <div>
                <p className="text-xs text-gray-400">Distance</p>
                <p className="text-sm font-semibold">{order.distance?.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ETA</p>
                <p className="text-sm font-semibold">{order.estimatedTime} min</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Weight</p>
                <p className="text-sm font-semibold">{order.packageWeight} kg</p>
              </div>
            </div>
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="mt-4 w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel Order
              </button>
            )}
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-gray-400" /> Payment
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Base fare</span>
                <span>₹{order.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{isPassenger ? "Booking Charges" : "Delivery fee"}</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-100 pt-2 mt-1">
                <span>Total</span>
                <span className="text-base">₹{order.totalAmount}</span>
              </div>
            </div>

            {isPaid ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">
                    {isCash ? "Cash Received" : "Payment Successful"}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    ₹{order.totalAmount} · {isCash ? "Cash on Delivery" : "Online"}
                  </p>
                </div>
              </div>
            ) : isCancelled ? (
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                Order cancelled — no payment required
              </div>
            ) : payMethod === "cash" ? (
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <Banknote className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Pay ₹{order.totalAmount} to driver
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Cash on Delivery — pay when package arrives
                  </p>
                </div>
              </div>
            ) : isFailed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-700 font-medium">
                    Payment failed. Please retry.
                  </p>
                </div>
                <button
                  onClick={handlePayOnline}
                  disabled={payLoading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {payLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  ) : "💳 Retry Payment"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-700 font-medium">Payment pending</p>
                </div>
                {payMethod === "online" && (
                  <>
                    <button
                      onClick={handlePayOnline}
                      disabled={payLoading}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
                    >
                      {payLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opening...</>
                      ) : (
                        <><IndianRupee className="h-4 w-4" /> Pay ₹{order.totalAmount} Now</>
                      )}
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      Secured by Razorpay · UPI · Cards · Wallets
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <AIPriceExplainer order={order} />

          {/* Driver info */}
          {hasDriver && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Your Driver</h3>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
                  {order.driver.user?.name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.driver.user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ⭐ {order.driver.rating?.toFixed(1) || "New"} · {order.driver.vehicleType || "Bike"}
                  </p>
                </div>
                <a
                  href={`tel:${order.driver.user?.phone}`}
                  className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"
                >
                  <Phone className="h-4 w-4 text-green-600" />
                </a>
              </div>

              {/* Live status pill */}
              {driverLocation && !isDelivered && !isCancelled && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-xs text-blue-700 font-medium">
                    {order.status === "accepted"
                      ? "Driver is heading to pickup location"
                      : order.status === "picked_up" || order.status === "in_transit"
                        ? "Package picked up — heading to drop"
                        : "Driver location updating live"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rating — show after delivery */}
          {isDelivered && !ratingDone && (
            <div className="card p-5 border-2 border-primary-100">
              <h3 className="font-semibold text-gray-800 mb-1">Rate Your Delivery</h3>
              <p className="text-xs text-gray-500 mb-4">How was your experience?</p>
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}>
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRatingModal(true)} className="btn-primary w-full">
                Submit Rating
              </button>
            </div>
          )}

          {isDelivered && ratingDone && (
            <div className="card p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Rating submitted</p>
                <p className="text-xs text-gray-400">
                  {"★".repeat(order.customerRating || rating)} — Thank you!
                </p>
              </div>
            </div>
          )}

          {/* Chat */}
          {hasDriver && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" /> Chat with Driver
              </h3>
              <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center pt-6">No messages yet</p>
                ) : (
                  messages.map((m, i) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div key={m.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                            isMe
                              ? "bg-primary-600 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          {m.message}
                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-200" : "text-gray-400"}`}>
                            {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
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

        {/* ── Right column — Map ────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="card overflow-hidden" style={{ height: "560px" }}>
            {/* Map header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">{mapLabel}</h3>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Pickup
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Drop
                </span>
                {driverLocation && !isDelivered && !isCancelled && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" /> Driver
                  </span>
                )}
              </div>
            </div>

            {/* Map canvas */}
            <div
              ref={mapRef}
              style={{ height: "calc(100% - 45px)" }}
              className="w-full bg-gray-100"
            >
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <MapPin className="h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-400">Map not configured</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick open-in-maps links */}
          <div className="flex gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${order.pickupLat},${order.pickupLng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex-1 text-center text-sm"
            >
              📍 Open Pickup in Maps
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${order.dropLat},${order.dropLng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex-1 text-center text-sm"
            >
              📍 Open Drop in Maps
            </a>
          </div>
        </div>
      </div>

      {/* ── Cancel Modal ─────────────────────────────────── */}
      {showCancelModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCancelModal(false)} />
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
                rows={3}
                placeholder="Please tell us why you're cancelling..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {["Changed my mind", "Wrong address", "Driver taking too long", "Ordered by mistake"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setCancelReason(r)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {r}
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
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Rating Modal ─────────────────────────────────── */}
      {showRatingModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRatingModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900">Rate Your Experience</h3>
              <p className="text-xs text-gray-500 mt-1">Help us improve by rating your delivery</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}>
                    <Star
                      className={`h-10 w-10 transition-all ${
                        star <= rating
                          ? "text-yellow-400 fill-yellow-400 scale-110"
                          : "text-gray-200 hover:text-yellow-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600">
                {rating === 0 ? "Tap a star to rate"
                  : rating === 1 ? "😞 Poor"
                  : rating === 2 ? "😐 Fair"
                  : rating === 3 ? "🙂 Good"
                  : rating === 4 ? "😊 Great"
                  : "🌟 Excellent!"}
              </p>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                placeholder="Write a review (optional)..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowRatingModal(false)} className="flex-1 btn-secondary">
                  Skip
                </button>
                <button
                  onClick={handleRating}
                  disabled={!rating || ratingLoading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {ratingLoading ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}