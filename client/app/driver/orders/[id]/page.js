"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import {
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Navigation,
  Camera,
  Banknote,
  CheckCircle,
  KeyRound,
  Upload,
  IndianRupee,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  fetchOrderById,
  selectCurrentOrder,
} from "../../../../redux/slices/orderSlice";
import { selectUser } from "../../../../redux/slices/authSlice";
import { useRequireAuth } from "../../../../components/shared/AuthGuard";
import { DashboardLayout } from "../../../../components/shared/Layout";
import { StatusBadge, LoadingSpinner } from "../../../../components/ui";
import { useSocket } from "../../../../hooks/useSocket";
import { useGeolocation } from "../../../../hooks";
import { orderService, chatService } from "../../../../services/index";
import toast from "react-hot-toast";
import AISmartReply from '../../../../components/ai/AISmartReply';
import DriverCancelModal from '../../../../components/DriverCancelModal';

// ── Open Google Maps turn-by-turn navigation ───────────────
const openGoogleMapsNavigation = (destLat, destLng) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  window.open(url, "_blank");
};

// ── Inline SVG truck icon as data URI (no external dep) ────
const DRIVER_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="22" fill="#2563eb" stroke="white" stroke-width="2"/>
  <text x="24" y="30" text-anchor="middle" font-size="22">🚚</text>
</svg>`.trim();
const DRIVER_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DRIVER_ICON_SVG)}`;

// ── Smooth marker animation (ease-out cubic, ~800ms) ───────
function animateMarker(
  marker,
  targetLat,
  targetLng,
  steps = 60,
  durationMs = 800,
) {
  const startPos = marker.getPosition();
  if (!startPos) return;
  const startLat = startPos.lat();
  const startLng = startPos.lng();
  const dLat = targetLat - startLat;
  const dLng = targetLng - startLng;
  let step = 0;
  const iv = setInterval(() => {
    step++;
    const eased = 1 - Math.pow(1 - step / steps, 3);
    marker.setPosition(
      new window.google.maps.LatLng(
        startLat + dLat * eased,
        startLng + dLng * eased,
      ),
    );
    if (step >= steps) clearInterval(iv);
  }, durationMs / steps);
}

// ── Draw/replace route between two points ─────────────────
function drawRoute(map, origin, destination, rendererRef, color = "#2563eb") {
  if (rendererRef.current) {
    rendererRef.current.setMap(null);
    rendererRef.current = null;
  }
  const dr = new window.google.maps.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: { strokeColor: color, strokeWeight: 4 },
  });
  dr.setMap(map);
  rendererRef.current = dr;

  new window.google.maps.DirectionsService().route(
    {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") dr.setDirections(result);
    },
  );
}

// ── How long ago (human-readable) ─────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function DriverOrderDetailPage() {
  useRequireAuth("driver");
  const { id } = useParams();
  const dispatch = useDispatch();
  const order = useSelector(selectCurrentOrder);
  const user = useSelector(selectUser);

  // GPS — watch mode ON (continuous updates)
  const { location, error: gpsError } = useGeolocation(true);
  const locationRef = useRef(null); // always holds latest location for interval
  locationRef.current = location;

  const {
    joinOrderRoom,
    leaveOrderRoom,
    sendChatMessage,
    onChatMessage,
    updateLocation,
  } = useSocket();

  // ── Location broadcast interval ref ───────────────────
  const locationIntervalRef = useRef(null);

  // ── Chat ────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  // ── Map ─────────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Pickup OTP ──────────────────────────────────────────
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // ── Delivery OTP ────────────────────────────────────────
  const [showDelOtpModal, setShowDelOtpModal] = useState(false);
  const [deliveryOtpSent, setDeliveryOtpSent] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");

  // ── Delivery proof photo ─────────────────────────────────
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);

  // ── Cash collection ──────────────────────────────────────
  const [cashLoading, setCashLoading] = useState(false);

  // ── Status update ────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Track previous order status to avoid re-running map transitions
  const prevStatusRef = useRef(null);

  const isPassenger = order?.orderType === "passenger";


  const lastCustomerMsg = messages.filter(m => m.senderRole === 'customer').at(-1)?.message;

  // ─────────────────────────────────────────────────────────
  // 1. Load order
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  // ─────────────────────────────────────────────────────────
  // 2. Join socket room (once, on mount)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    joinOrderRoom(id);
    return () => leaveOrderRoom(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // 3. Broadcast GPS location to server every 4 seconds
  //
  //    FIXES from original:
  //    • Used `location` directly in interval closure → stale closure bug
  //      (interval captured the location value at setup time, never updated).
  //      Fixed by reading from `locationRef.current` inside the interval.
  //    • Interval was restarted on every `location` change → dozens of
  //      overlapping intervals. Fixed by depending only on `order?.status`.
  //    • No cleanup when order status changes to non-active. Fixed.
  //    • No immediate first broadcast. Fixed.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const activeStatuses = ["accepted", "picked_up", "in_transit"];
    if (!order?.status || !activeStatuses.includes(order.status)) {
      // Clear any running interval when order is not active
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      return;
    }

    // Immediate first send
    if (locationRef.current?.lat && locationRef.current?.lng) {
      updateLocation(locationRef.current.lat, locationRef.current.lng, id);
    }

    // Then every 4 seconds — reads from ref, NOT from closure
    locationIntervalRef.current = setInterval(() => {
      const loc = locationRef.current;
      if (loc?.lat && loc?.lng) {
        updateLocation(loc.lat, loc.lng, id);
      }
    }, 4000);

    return () => {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    };
  }, [order?.status, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // 4. Init Google Map (once when order is available)
  // ─────────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || !order || mapInstanceRef.current) return;

    const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
    const dropLatLng = { lat: order.dropLat, lng: order.dropLng };

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 14,
      center: pickupLatLng,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    // Pickup marker (green)
    new window.google.maps.Marker({
      position: pickupLatLng,
      map,
      title: "Pickup",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" },
    });

    // Drop marker (red)
    new window.google.maps.Marker({
      position: dropLatLng,
      map,
      title: "Drop",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" },
    });

    // Default route pickup → drop (grey, static reference)
    drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#0390fc"); //#94a3b8

    setMapReady(true);
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!order) return;
    if (window.google?.maps) {
      initMap();
    } else if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
      if (!document.getElementById("gmaps-script")) {
        const script = document.createElement("script");
        script.id = "gmaps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
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
  // 5. Status-aware route changes
  //
  //    Real delivery flow:
  //    accepted   → driver is going TO pickup   → draw driver→pickup (orange)
  //    picked_up  → driver has package, going to drop → draw driver→drop (blue)
  //    in_transit → same as picked_up, blue route
  //    delivered  → hide driver marker, show static pickup→drop (grey)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !order) return;
    if (prevStatusRef.current === order.status) return;
    prevStatusRef.current = order.status;

    const map = mapInstanceRef.current;
    const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
    const dropLatLng = { lat: order.dropLat, lng: order.dropLng };

    if (order.status === "delivered" || order.status === "cancelled") {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
      drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#94a3b8");
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (order.status === "accepted" && locationRef.current) {
      const driverPos = {
        lat: locationRef.current.lat,
        lng: locationRef.current.lng,
      };
      drawRoute(map, driverPos, pickupLatLng, routeRendererRef, "#f97316"); // orange: driver→pickup
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(driverPos);
      bounds.extend(pickupLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (order.status === "picked_up" || order.status === "in_transit") {
      drawRoute(map, pickupLatLng, dropLatLng, routeRendererRef, "#2563eb"); // blue: pickup→drop
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropLatLng);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }
  }, [order?.status, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // 6. Driver marker — update on every GPS tick
  //
  //    FIXES from original:
  //    • Old code called `setMap(null)` then created a brand new marker every
  //      GPS tick → flickering marker, expensive, loses zIndex/icon on each tick.
  //      Fixed: create once, then smoothly animate to new position.
  //    • No smooth movement — teleporting. Fixed with animateMarker().
  //    • Map re-centered on driver every tick. Fixed: pan only if driver
  //      goes outside visible bounds.
  //    • Route redraw on "accepted" status now uses live driver position.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !location) return;

    const activeStatuses = ["accepted", "picked_up", "in_transit"];
    if (!order?.status || !activeStatuses.includes(order.status)) return;

    const map = mapInstanceRef.current;
    const pos = { lat: Number(location.lat), lng: Number(location.lng) };

    if (!driverMarkerRef.current) {
      // Create driver marker once
      driverMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map,
        title: "You (Driver)",
        icon: {
          url: DRIVER_ICON_URL,
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        },
        zIndex: 9999,
      });

      // Center on driver at first appearance
      map.panTo(pos);

      // First real route draw for "accepted" status
      if (order.status === "accepted") {
        const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
        drawRoute(map, pos, pickupLatLng, routeRendererRef, "#f97316");
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(pos);
        bounds.extend(pickupLatLng);
        map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      }
    } else {
      // Smooth animated movement, no flicker
      animateMarker(driverMarkerRef.current, pos.lat, pos.lng);

      // Ensure marker stays on the map (shouldn't detach, but safety check)
      if (!driverMarkerRef.current.getMap()) {
        driverMarkerRef.current.setMap(map);
      }

      // Re-draw driver→pickup route on "accepted" only (not every tick for other statuses)
      if (order.status === "accepted") {
        const pickupLatLng = { lat: order.pickupLat, lng: order.pickupLng };
        drawRoute(map, pos, pickupLatLng, routeRendererRef, "#f97316");
      }

      // Pan gently only if driver moves completely outside the visible viewport
      const bounds = map.getBounds();
      if (
        bounds &&
        !bounds.contains(new window.google.maps.LatLng(pos.lat, pos.lng))
      ) {
        map.panTo(pos);
      }
    }
  }, [location, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // 7. Chat — load history
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

  // // ─────────────────────────────────────────────────────────
  // // 9. Auto-scroll chat
  // // ─────────────────────────────────────────────────────────
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
            m.senderId === msg.senderId,
        );

        if (isOptimisticMatch) {
          // Swap out the temporary placeholder with the permanent database entry cleanly
          return prev.map((m) =>
            m.id.toString().startsWith("temp-") &&
            m.message === msg.message &&
            m.senderId === msg.senderId
              ? msg
              : m,
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
    sendChatMessage(id, trimmedInput, "driver");
  };

  const handleAccept = async () => {
    try {
      setStatusLoading(true);
      await orderService.acceptOrder(id);
      toast.success("Order accepted!");
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to accept");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStatus = async (status) => {
    try {
      setStatusLoading(true);
      await orderService.updateStatus(id, status);
      toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  // Pickup OTP
  const handleSendOtp = async () => {
    try {
      setOtpLoading(true);
      await orderService.generatePickupOtp(id);
      setOtpSent(true);
      toast.success("OTP sent to customer");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      toast.error("Enter 6-digit OTP");
      return;
    }
    try {
      setOtpLoading(true);
      await orderService.verifyPickupOtp(id, otpInput);
      toast.success("Pickup verified!");
      setShowOtpModal(false);
      setOtpInput("");
      setOtpSent(false);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Delivery OTP
  const handleGenerateDeliveryOtp = async () => {
    try {
      setOtpLoading(true);
      await orderService.generateDeliveryOtp(order.id);
      setDeliveryOtpSent(true);
      toast.success("OTP sent to receiver");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyDeliveryOtp = async () => {
    if (deliveryOtp.length !== 6) {
      toast.error("Enter 6-digit OTP");
      return;
    }
    try {
      setOtpLoading(true);
      await orderService.verifyDeliveryOtp(order.id, deliveryOtp);
      toast.success("Receiver verified!");
      setShowDelOtpModal(false);
      setDeliveryOtp("");
      setDeliveryOtpSent(false);
      dispatch(fetchOrderById(order.id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Delivery proof photo
  const handleProofSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleProofSubmit = async () => {
    if (!proofFile) {
      toast.error("Please select a photo");
      return;
    }
    try {
      setProofLoading(true);
      const formData = new FormData();
      formData.append("photo", proofFile);
      await orderService.uploadDeliveryProof(id, formData);
      toast.success("Delivery confirmed!");
      setShowProofModal(false);
      setProofFile(null);
      setProofPreview(null);
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to upload proof");
    } finally {
      setProofLoading(false);
    }
  };

  const closeProofModal = () => {
    setShowProofModal(false);
    setProofFile(null);
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview); // prevent memory leak
      setProofPreview(null);
    }
  };

  // Cash collection
  const handleCashCollected = async () => {
    try {
      setCashLoading(true);
      await orderService.markCashCollected(id);
      toast.success("Cash collection confirmed!");
      dispatch(fetchOrderById(id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setCashLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────
  if (!order) {
    return (
      <DashboardLayout role="driver" title="Order Detail">
        <LoadingSpinner text="Loading order..." />
      </DashboardLayout>
    );
  }

  const isCash = order.paymentMethod === "cash";
  const cashDone = order.cashCollected;
  const pickupOtpVerified = order.pickupOtpVerified;
  const deliveryOtpVerified = order.deliveryOtpVerified;
  const activeStatuses = ["accepted", "picked_up", "in_transit"];
  const isActive = activeStatuses.includes(order.status);
  const isDelivered = order.status === "delivered";

  // Dynamic map header label based on real delivery phase
  const mapLabel = (() => {
    if (!location) return "Route Map";
    if (order.status === "accepted") return "🟠 Heading to pickup";
    if (order.status === "picked_up") return "🔵 Heading to drop";
    if (order.status === "in_transit") return "🔵 In transit to drop";
    if (isDelivered) return "✅ Delivery complete";
    return "Route Map";
  })();

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <DashboardLayout role="driver" title={`Order #${order.orderNumber}`}>
      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status + Addresses */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{isPassenger ? "Booking" : "Order Status"}</h3>
              <StatusBadge status={order.status} />
            </div>

            <div className="space-y-3 mb-4">
              {/* Pickup row */}
              <div className="flex gap-3 items-start">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm text-gray-700 truncate">
                    {order.pickupAddress}
                  </p>
                </div>
                <button
                  onClick={() =>
                    openGoogleMapsNavigation(order.pickupLat, order.pickupLng)
                  }
                  className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"
                  title="Navigate to pickup"
                >
                  <Navigation className="h-3.5 w-3.5 text-blue-600" />
                </button>
              </div>

              {/* Drop row */}
              <div className="flex gap-3 items-start">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Drop</p>
                  <p className="text-sm text-gray-700 truncate">
                    {order.dropAddress}
                  </p>
                </div>
                <button
                  onClick={() =>
                    openGoogleMapsNavigation(order.dropLat, order.dropLng)
                  }
                  className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0"
                  title="Navigate to drop"
                >
                  <Navigation className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center text-xs">
              <div>
                <p className="text-gray-400">Distance</p>
                <p className="font-semibold text-sm">
                  {order.distance?.toFixed(1)} km
                </p>
              </div>
              <div>
                <p className="text-gray-400">ETA</p>
                <p className="font-semibold text-sm">
                  {order.estimatedTime} min
                </p>
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
                <p className="text-sm font-medium text-gray-900">
                  {order.customer?.name}
                </p>
                <a
                  href={`tel:${order.customer?.phone}`}
                  className="text-xs text-primary-600 hover:underline"
                >
                  {order.customer?.phone}
                </a>
              </div>
              <a
                href={`tel:${order.customer?.phone}`}
                className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"
              >
                <Phone className="h-4 w-4 text-green-600" />
              </a>
            </div>

            {/* Payment method badge */}
            <div
              className={`mt-3 flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs font-medium ${
                isCash
                  ? "bg-orange-50 text-orange-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {isCash ? (
                <>
                  <Banknote className="h-3.5 w-3.5" /> Cash on Delivery
                </>
              ) : (
                <>
                  <IndianRupee className="h-3.5 w-3.5" /> Online Payment
                </>
              )}
              {isCash && cashDone && (
                <span className="ml-auto flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Collected
                </span>
              )}
            </div>


            {['accepted', 'picked_up'].includes(order.status) && (
              <button onClick={() => setShowCancelModal(true)} className="mt-4 w-full bg-red-100 hover:bg-red-200 text-red-600 font-medium py-2.5 rounded-xl transition-colors text-sm">
                Cancel This Delivery
              </button>
            )}

            <DriverCancelModal
              orderId={order.id}
              open={showCancelModal}
              onClose={() => setShowCancelModal(false)}
              onCancelled={() => dispatch(fetchOrderById(order.id))}
            />
          </div>

          {/* ── Action Buttons (real-world ordered flow) ─── */}
          <div className="space-y-3">
            {/* STEP 1: Accept order (pending) */}
            {order.status === "pending" && (
              <button
                onClick={handleAccept}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {statusLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                    Accepting...
                  </>
                ) : (
                  "✅ Accept Order"
                )}
              </button>
            )}

            {/* STEP 2: Verify pickup OTP (accepted, OTP not yet done) */}
            {/* {order.status === "accepted" && !pickupOtpVerified && (
              <div className="card p-4 border-l-4 border-l-yellow-400 bg-yellow-50">
                <p className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-yellow-500" />
                  Verify Pickup OTP
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  You must verify OTP from the customer before picking up the package.
                </p>
                <button
                  onClick={() => setShowOtpModal(true)}
                  className="btn-secondary w-full text-sm py-2"
                >
                  Send & Verify OTP
                </button>
              </div>
            )} */}

            {/* STEP 2: Verify pickup OTP */}
            {order.status === "accepted" && !pickupOtpVerified && (
              <div className="card p-4 border-l-4 border-l-yellow-400 bg-yellow-50">
                <p className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-yellow-500" />
                  Verify Pickup OTP
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {isPassenger
                    ? "You must verify the secure trip code from the passenger before starting the ride."
                    : "You must verify OTP from the customer before picking up the package."}
                </p>
                <button
                  onClick={() => setShowOtpModal(true)}
                  className="btn-secondary w-full text-sm py-2"
                >
                  Send & Verify OTP
                </button>
              </div>
            )}

            {/* OTP verified badge */}
            {order.status === "accepted" && pickupOtpVerified && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-xs text-green-700 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Pickup OTP verified
              </div>
            )}

            {/* STEP 3: Mark as picked up (only after OTP) */}
            {order.status === "accepted" && pickupOtpVerified && (
              <button
                onClick={() => handleStatus("picked_up")}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {statusLoading ? "Updating..." : "📦 Mark as Picked Up"}
              </button>
            )}

            {/* STEP 4: Mark in transit */}
            {order.status === "picked_up" && (
              <button
                onClick={() => handleStatus("in_transit")}
                disabled={statusLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {statusLoading ? "Updating..." : "🚗 Mark In Transit"}
              </button>
            )}

            {/* STEP 5a: Delivery OTP (in_transit, OTP not yet verified) */}
            {order.status === "in_transit" &&
              !isPassenger &&
              !deliveryOtpVerified && (
                <div className="card p-4 border-l-4 border-l-blue-400 bg-blue-50">
                  <p className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-500" />
                    Verify Receiver OTP
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Send OTP to the receiver and verify before completing
                    delivery.
                  </p>
                  <button
                    onClick={() => setShowDelOtpModal(true)}
                    className="btn-secondary w-full text-sm py-2"
                  >
                    Send & Verify Receiver OTP
                  </button>
                </div>
              )}

            {/* Delivery OTP verified badge */}
            {order.status === "in_transit" &&
              !isPassenger &&
              deliveryOtpVerified && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-xs text-green-700 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" /> Receiver OTP verified
                </div>
              )}

            {/* STEP 5b: Upload proof & mark delivered (only after delivery OTP) */}
            {/* {order.status === "in_transit" && (isPassenger || deliveryOtpVerified) && (
              <button
                onClick={() => setShowProofModal(true)}
                className="w-full py-3 text-base bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="h-4 w-4" />
                Upload Proof & Mark Delivered
              </button>
            )} */}

            {order.status === "in_transit" &&
              (isPassenger || deliveryOtpVerified) && (
                <div className="card p-4 border-l-4 border-l-green-400 bg-green-50">
                  <p className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-green-500" />
                    {isPassenger
                      ? "Complete Drop-off Proof"
                      : "Complete Delivery Proof"}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {isPassenger
                      ? "Please take a safety photo at the drop-off destination to finish the trip."
                      : "Please take a package handover snapshot to finish this delivery."}
                  </p>
                  {/* <button
                    onClick={() => setShowProofModal(true)}
                    className="w-full text-sm py-2"
                  >
                    📸 Upload Proof & Complete
                  </button> */}

                  <button
                    onClick={() => setShowProofModal(true)}
                    className="w-full py-3 text-base bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Upload Proof & Mark Delivered
                  </button>
                </div>
              )}

            {/* STEP 6: Cash collection (if COD, not yet collected) */}
            {isCash &&
              !cashDone &&
              ["in_transit", "delivered"].includes(order.status) && (
                <button
                  onClick={handleCashCollected}
                  disabled={cashLoading}
                  className="w-full py-3 text-base bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {cashLoading ? (
                    "Confirming..."
                  ) : (
                    <>
                      <Banknote className="h-4 w-4" /> Confirm Cash Collected ₹
                      {order.totalAmount}
                    </>
                  )}
                </button>
              )}

            {/* Delivered success state */}
            {isDelivered && (
              <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium text-sm">
                  Order delivered successfully
                </span>
              </div>
            )}
          </div>

          {/* GPS status / warning */}
          {isActive && (
            <div
              className={`card p-3 flex items-center gap-3 ${gpsError ? "border-orange-200 bg-orange-50" : ""}`}
            >
              {gpsError ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">
                    GPS unavailable — customer cannot track you
                  </p>
                </>
              ) : location ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    GPS active — sharing location with customer
                  </p>
                  <span className="ml-auto text-xs text-gray-400 tabular-nums">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500">Acquiring GPS…</p>
                </>
              )}
            </div>
          )}

          {/* Chat (only when order is active) */}
          {isActive && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                Chat with Customer
              </h3>
              <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center pt-6">
                    No messages yet
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id || i}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                            isMe
                              ? "bg-primary-600 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          {m.message}
                          <p
                            className={`text-[10px] mt-1 ${isMe ? "text-primary-200" : "text-gray-400"}`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <AISmartReply
                lastCustomerMessage={lastCustomerMsg}
                orderStatus={order.status}
                onUse={(text) => setChatInput(text)}
              />
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
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

        {/* ── Right column — Map ───────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="card overflow-hidden" style={{ height: "520px" }}>
            {/* Map header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                {mapLabel}
              </h3>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{" "}
                  Pickup
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{" "}
                  Drop
                </span>
                {location && isActive && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />{" "}
                    You
                  </span>
                )}
              </div>
            </div>

            {/* Map canvas */}
            <div
              ref={mapRef}
              style={{ height: "calc(100% - 45px)" }}
              className="w-full"
            >
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 gap-3">
                  <MapPin className="h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    Google Maps not configured
                  </p>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-2">
                      Navigate manually:
                    </p>
                    <button
                      onClick={() =>
                        openGoogleMapsNavigation(
                          order.pickupLat,
                          order.pickupLng,
                        )
                      }
                      className="btn-secondary text-xs py-1.5 px-3 mb-2 block mx-auto"
                    >
                      Open Pickup in Maps
                    </button>
                    <button
                      onClick={() =>
                        openGoogleMapsNavigation(order.dropLat, order.dropLng)
                      }
                      className="btn-primary text-xs py-1.5 px-3 block mx-auto"
                    >
                      Open Drop in Maps
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation quick-links */}
          <div className="flex gap-3">
            <button
              onClick={() =>
                openGoogleMapsNavigation(order.pickupLat, order.pickupLng)
              }
              className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <Navigation className="h-4 w-4" /> Navigate to Pickup
            </button>
            <button
              onClick={() =>
                openGoogleMapsNavigation(order.dropLat, order.dropLng)
              }
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <Navigation className="h-4 w-4" /> Navigate to Drop
            </button>
          </div>
        </div>
      </div>

      {/* ── Pickup OTP Modal ──────────────────────────────── */}
      {showOtpModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowOtpModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-yellow-500" /> Pickup OTP
                Verification
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ask the customer for the OTP sent to their phone
              </p>
            </div>
            <div className="p-5 space-y-4">
              {!otpSent ? (
                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="btn-primary w-full"
                >
                  {otpLoading ? "Sending..." : "Send OTP to Customer"}
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
                      inputMode="numeric"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) =>
                        setOtpInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="6-digit OTP"
                      className="input-field text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpInput.length !== 6}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {otpLoading ? "Verifying..." : "Verify & Confirm Pickup"}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Delivery OTP Modal ────────────────────────────── */}
      {showDelOtpModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDelOtpModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-500" /> Delivery OTP
                Verification
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ask the receiver for the OTP sent to their phone
              </p>
            </div>
            <div className="p-5 space-y-4">
              {!deliveryOtpSent ? (
                <button
                  onClick={handleGenerateDeliveryOtp}
                  disabled={otpLoading}
                  className="btn-primary w-full"
                >
                  {otpLoading ? "Sending..." : "Send OTP to Receiver"}
                </button>
              ) : (
                <>
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> OTP sent to receiver
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Enter Receiver OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={deliveryOtp}
                      onChange={(e) =>
                        setDeliveryOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="6-digit OTP"
                      className="input-field text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <button
                    onClick={handleVerifyDeliveryOtp}
                    disabled={otpLoading || deliveryOtp.length !== 6}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {otpLoading
                      ? "Verifying..."
                      : "Verify OTP & Complete Delivery"}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Delivery Proof Modal ──────────────────────────── */}
      {showProofModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeProofModal}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[95%] max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary-600" /> Upload Delivery
                Proof
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Take a photo of the delivered package at the drop location
              </p>
            </div>
            <div className="p-5 space-y-4">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleProofSelect}
                  className="sr-only"
                />
                {proofPreview ? (
                  <div className="relative">
                    <img
                      src={proofPreview}
                      alt="Delivery proof"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <p className="text-xs text-center text-primary-600 mt-2">
                      Tap to change photo
                    </p>
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 transition-colors">
                    <Camera className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Tap to take / select photo
                    </p>
                  </div>
                )}
              </label>

              <div className="flex gap-3">
                <button
                  onClick={closeProofModal}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProofSubmit}
                  disabled={!proofFile || proofLoading}
                  className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {proofLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Confirm Delivery
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
