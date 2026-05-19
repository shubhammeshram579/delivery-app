// 'use client';
// import { useEffect, useRef, useCallback } from 'react';
// import { io } from 'socket.io-client';
// import { useDispatch, useSelector } from 'react-redux';
// import Cookies from 'js-cookie';
// import { updateDriverLocation, updateOrderStatusRealtime } from '../redux/slices/orderSlice';
// import { addNotification } from '../redux/slices/notificationSlice';
// import { selectIsAuthenticated } from '../redux/slices/authSlice';
// import toast from 'react-hot-toast';

// const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// let socketInstance = null;

// export const useSocket = () => {
//   const dispatch = useDispatch();
//   const isAuthenticated = useSelector(selectIsAuthenticated);
//   const socketRef = useRef(null);

//   useEffect(() => {
//     if (!isAuthenticated) return;

//     const token = Cookies.get('accessToken');
//     if (!token) return;

//     // Reuse single socket instance
//     if (!socketInstance) {
//       socketInstance = io(SOCKET_URL, {
//         auth: { token },
//         transports: ['websocket'],
//         reconnection: true,
//         reconnectionDelay: 1000,
//         reconnectionAttempts: 5,
//       });
//     }

//     socketRef.current = socketInstance;
//     const socket = socketInstance;

//     socket.on('connect', () => {
//       console.log('[Socket] Connected:', socket.id);
//     });

//     socket.on('connect_error', (err) => {
//       console.error('[Socket] Connection error:', err.message);
//     });

//     // ── Real-time events ──────────────────────────────────
//     socket.on('order:location', ({ lat, lng, orderId, speed, heading }) => {
//       dispatch(updateDriverLocation({ lat, lng, orderId, speed, heading }));
//     });

//     socket.on('order:status', ({ orderId, status }) => {
//       dispatch(updateOrderStatusRealtime({ orderId, status }));
//     });

//     socket.on('notification', (notification) => {
//       dispatch(addNotification(notification));
//       toast(notification.body, {
//         icon: notification.type === 'payment' ? '💳' : notification.type === 'order' ? '📦' : '🔔',
//         duration: 4000,
//       });
//     });

//     return () => {
//       socket.off('order:location');
//       socket.off('order:status');
//       socket.off('notification');
//     };
//   }, [isAuthenticated, dispatch]);

//   const trackOrder = useCallback((orderId) => {
//     socketRef.current?.emit('order:track', { orderId });
//   }, []);

//   const untrackOrder = useCallback((orderId) => {
//     socketRef.current?.emit('order:untrack', { orderId });
//   }, []);

//   const goOnline = useCallback(() => {
//     socketRef.current?.emit('driver:online', {});
//   }, []);

//   const updateLocation = useCallback((lat, lng, orderId) => {
//     socketRef.current?.emit('driver:location', { lat, lng, orderId });
//   }, []);

//   const sendChatMessage = useCallback((orderId, message, senderRole) => {
//     socketRef.current?.emit('chat:send', { orderId, message, senderRole });
//   }, []);

//   const onChatMessage = useCallback((handler) => {
//     socketRef.current?.on('chat:message', handler);
//     return () => socketRef.current?.off('chat:message', handler);
//   }, []);

//   return { trackOrder, untrackOrder, goOnline, updateLocation, sendChatMessage, onChatMessage };
// };


'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { updateDriverLocation, updateOrderStatusRealtime } from '../redux/slices/orderSlice';
import { addNotification } from '../redux/slices/notificationSlice';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const useSocket = () => {
  const dispatch = useDispatch();

  // Safe selector — returns false if state.auth doesn't exist yet
  const isAuthenticated = useSelector(
    (state) => state?.auth?.isAuthenticated ?? false
  );

  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = Cookies.get('accessToken');
    if (!token) return;

    // Dynamically import socket.io-client to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      if (!socketInstance) {
        socketInstance = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });
      }

      socketRef.current = socketInstance;
      const socket = socketInstance;

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
      });

      socket.on('order:location', ({ lat, lng, orderId, speed, heading }) => {
        dispatch(updateDriverLocation({ lat, lng, orderId, speed, heading }));
      });

      socket.on('order:status', ({ orderId, status }) => {
        dispatch(updateOrderStatusRealtime({ orderId, status }));
      });

      socket.on('notification', (notification) => {
        dispatch(addNotification(notification));
        toast(notification.body, {
          icon: notification.type === 'payment' ? '💳'
            : notification.type === 'order' ? '📦' : '🔔',
          duration: 4000,
        });
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('order:location');
        socketRef.current.off('order:status');
        socketRef.current.off('notification');
      }
    };
  }, [isAuthenticated, dispatch]);

  const trackOrder = useCallback((orderId) => {
    socketRef.current?.emit('order:track', { orderId });
  }, []);

  const untrackOrder = useCallback((orderId) => {
    socketRef.current?.emit('order:untrack', { orderId });
  }, []);

  const goOnline = useCallback(() => {
    socketRef.current?.emit('driver:online', {});
  }, []);

  const updateLocation = useCallback((lat, lng, orderId) => {
    socketRef.current?.emit('driver:location', { lat, lng, orderId });
  }, []);

  const sendChatMessage = useCallback((orderId, message, senderRole) => {
    socketRef.current?.emit('chat:send', { orderId, message, senderRole });
  }, []);

  const onChatMessage = useCallback((handler) => {
    socketRef.current?.on('chat:message', handler);
    return () => socketRef.current?.off('chat:message', handler);
  }, []);

  return {
    trackOrder,
    untrackOrder,
    goOnline,
    updateLocation,
    sendChatMessage,
    onChatMessage,
  };
};
