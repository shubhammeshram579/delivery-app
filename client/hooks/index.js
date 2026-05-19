'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// ── useGeolocation ────────────────────────────────────────
export const useGeolocation = (watchMode = false) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

  const onSuccess = useCallback((pos) => {
    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    setError(null);
  }, []);

  const onError = useCallback((err) => {
    setError(err.message);
    toast.error('Location access denied. Please enable GPS.');
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    if (watchMode) {
      watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, options);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [watchMode]);

  return { location, error };
};

// ── useRazorpay ───────────────────────────────────────────
export const useRazorpay = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.Razorpay) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);

  const openCheckout = useCallback(({ razorpayOrderId, amount, currency, keyId, orderId, user, onSuccess, onError }) => {
    if (!loaded || !window.Razorpay) {
      toast.error('Payment gateway not loaded. Please retry.');
      return;
    }

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: razorpayOrderId,
      name: 'Delivery App',
      description: `Payment for order`,
      image: '/logo.png',
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#0ea5e9' },
      handler: (response) => onSuccess?.({ ...response, orderId }),
      modal: { ondismiss: () => toast('Payment cancelled') },
    });

    rzp.on('payment.failed', (response) => {
      toast.error('Payment failed. Please try again.');
      onError?.(response);
    });

    rzp.open();
  }, [loaded]);

  return { loaded, openCheckout };
};

// ── useGoogleMaps ─────────────────────────────────────────
export const useGoogleMaps = (mapRef, options = {}) => {
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) return;

    const initMap = () => {
      const m = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center: { lat: 19.9975, lng: 73.7898 }, // Nashik default
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
        ...options,
      });
      setMap(m);
      setMapLoaded(true);
    };

    if (window.google?.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [mapRef.current]);

  const addMarker = useCallback((lat, lng, icon, title) => {
    if (!map) return null;
    return new window.google.maps.Marker({ position: { lat, lng }, map, icon, title });
  }, [map]);

  const drawRoute = useCallback((origin, destination) => {
    if (!map) return;
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#0ea5e9', strokeWeight: 4 },
    });
    directionsRenderer.setMap(map);

    directionsService.route({
      origin: new window.google.maps.LatLng(origin.lat, origin.lng),
      destination: new window.google.maps.LatLng(destination.lat, destination.lng),
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK') directionsRenderer.setDirections(result);
    });
  }, [map]);

  return { map, mapLoaded, addMarker, drawRoute };
};

// ── useDebounce ───────────────────────────────────────────
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ── usePagination ─────────────────────────────────────────
export const usePagination = (fetchFn, params = {}) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchFn({ page, limit, ...params });
  }, [page]);

  return { page, setPage, limit };
};
