// 'use client';

// import { useEffect, useRef, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import Cookies from 'js-cookie';
// import { updateDriverLocation, updateOrderStatusRealtime } from '../redux/slices/orderSlice';
// import { addNotification } from '../redux/slices/notificationSlice';
// import toast from 'react-hot-toast';

// const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// let socketInstance = null;
// // Queue rooms to join — if socket not ready yet, join on connect
// const pendingRooms = new Set();

// export const useSocket = () => {
//   const dispatch    = useDispatch();
//   const isAuthenticated = useSelector(s => s?.auth?.isAuthenticated ?? false);
//   const socketRef   = useRef(null);

//   useEffect(() => {
//     if (!isAuthenticated) return;

//     const token = Cookies.get('accessToken');
//     if (!token) return;

//     import('socket.io-client').then(({ io }) => {
//       if (!socketInstance) {
//         socketInstance = io(SOCKET_URL, {
//           auth: { token },
//           transports: ['websocket', 'polling'],
//           reconnection: true,
//           reconnectionDelay: 1000,
//           reconnectionAttempts: 10,
//         });
//       }

//       socketRef.current = socketInstance;
//       const socket = socketInstance;

//       // ── On connect: join any rooms that were requested before connection ──
//       socket.on('connect', () => {
//         console.log('[Socket] Connected:', socket.id);
//         // Flush pending rooms
//         pendingRooms.forEach(orderId => {
//           socket.emit('order:track', { orderId });
//           console.log('[Socket] Joined pending room:', orderId);
//         });
//       });

//       socket.on('connect_error', (err) => {
//         console.warn('[Socket] Connection error:', err.message);
//       });

//       socket.on('reconnect', () => {
//         console.log('[Socket] Reconnected');
//         // Re-join rooms after reconnect
//         pendingRooms.forEach(orderId => {
//           socket.emit('order:track', { orderId });
//         });
//       });

//       // ── Driver location → Redux ────────────────────────────────
//       socket.off('order:location').on('order:location', (data) => {
//         console.log('[Socket] order:location received:', data);
//         dispatch(updateDriverLocation(data));
//       });

//       // ── Order status update ────────────────────────────────────
//       socket.off('order:status').on('order:status', (data) => {
//         dispatch(updateOrderStatusRealtime(data));
//       });

//       // ── Notifications ──────────────────────────────────────────
//       socket.off('notification').on('notification', (notification) => {
//         dispatch(addNotification(notification));
//         toast(notification.body, {
//           icon: notification.type === 'payment' ? '💳'
//               : notification.type === 'order'   ? '📦' : '🔔',
//           duration: 4000,
//         });
//       });

//       // ── Chat (global handler — page-level handlers override) ───
//       socket.off('chat:message').on('chat:message', (msg) => {
//         // handled at page level via onChatMessage
//       });
//     });

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off('order:location');
//         socketRef.current.off('order:status');
//         socketRef.current.off('notification');
//         socketRef.current.off('connect');
//         socketRef.current.off('reconnect');
//       }
//     };
//   }, [isAuthenticated, dispatch]);

//   // ── Disconnect on logout ─────────────────────────────────────
//   useEffect(() => {
//     if (!isAuthenticated && socketInstance) {
//       socketInstance.disconnect();
//       socketInstance = null;
//       socketRef.current = null;
//       pendingRooms.clear();
//     }
//   }, [isAuthenticated]);

//   // ── Emit helper ───────────────────────────────────────────────
//   const emitIfConnected = useCallback((event, data) => {
//     if (socketRef.current?.connected) {
//       socketRef.current.emit(event, data);
//     } else {
//       console.warn(`[Socket] Not connected, queuing: ${event}`, data);
//     }
//   }, []);

//   // ── Join order tracking room ──────────────────────────────────
//   // KEY FIX: store in pendingRooms so it gets joined on connect too
//   const joinOrderRoom = useCallback((orderId) => {
//     if (!orderId) return;
//     pendingRooms.add(orderId);

//     if (socketRef.current?.connected) {
//       socketRef.current.emit('order:track', { orderId });
//       console.log('[Socket] joinOrderRoom (immediate):', orderId);
//     } else {
//       console.log('[Socket] joinOrderRoom (queued for connect):', orderId);
//     }
//   }, []);

//   const leaveOrderRoom = useCallback((orderId) => {
//     if (!orderId) return;
//     pendingRooms.delete(orderId);
//     socketRef.current?.emit('order:untrack', { orderId });
//   }, []);

//   // ── Driver helpers ────────────────────────────────────────────
//   const goOnline = useCallback(() => {
//     emitIfConnected('driver:online', {});
//   }, [emitIfConnected]);

//   // KEY FIX: always emit even if map is rendering
//   const updateLocation = useCallback((lat, lng, orderId) => {
//     if (!lat || !lng) return;
//     if (socketRef.current?.connected) {
//       socketRef.current.emit('driver:location', { lat, lng, orderId });
//     }
//   }, []);

//   // ── Chat ──────────────────────────────────────────────────────
//   const sendChatMessage = useCallback((orderId, message, senderRole) => {
//     emitIfConnected('chat:send', { orderId, message, senderRole });
//   }, [emitIfConnected]);

//   const onChatMessage = useCallback((handler) => {
//     if (!socketRef.current) return () => {};
//     socketRef.current.off('chat:message', handler);
//     socketRef.current.on('chat:message', handler);
//     return () => socketRef.current?.off('chat:message', handler);
//   }, []);

//   // Legacy aliases
//   const trackOrder   = joinOrderRoom;
//   const untrackOrder = leaveOrderRoom;

//   return {
//     trackOrder,
//     untrackOrder,
//     joinOrderRoom,
//     leaveOrderRoom,
//     goOnline,
//     updateLocation,
//     sendChatMessage,
//     onChatMessage,
//   };
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
const pendingRooms = new Set();

export const useSocket = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(s => s?.auth?.isAuthenticated ?? false);
  const socketRef = useRef(null);

  // Maintain a stable set of secondary temporary page listeners
  const pageChatHandlersRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = Cookies.get('accessToken');
    if (!token) return;

    import('socket.io-client').then(({ io }) => {
      if (!socketInstance) {
        socketInstance = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
        });
      }

      socketRef.current = socketInstance;
      const socket = socketInstance;

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        pendingRooms.forEach(orderId => {
          socket.emit('order:track', { orderId });
          console.log('[Socket] Joined pending room:', orderId);
        });
      });

      socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
      });

      socket.on('reconnect', () => {
        console.log('[Socket] Reconnected');
        pendingRooms.forEach(orderId => {
          socket.emit('order:track', { orderId });
        });
      });

      // ── Order Tracking Streams ──
      socket.off('order:location').on('order:location', (data) => {
        dispatch(updateDriverLocation(data));
      });

      socket.off('order:status').on('order:status', (data) => {
        dispatch(updateOrderStatusRealtime(data));
      });

      // ── System Push Notifications ──
      socket.off('notification').on('notification', (notification) => {
        dispatch(addNotification(notification));
        toast(notification.body, {
          icon: notification.type === 'payment' ? '💳' : notification.type === 'order' ? '📦' : '🔔',
          duration: 4000,
        });
      });

      // ── CRITICAL FIX: Unified Central Message Broadcaster ──
      // This catches the message from the websocket and passes it down to the active page handler
      socket.off('message').on('message', (msg) => {
        console.log('[Socket Hook] Central message event captured:', msg);
        pageChatHandlersRef.current.forEach((handler) => handler(msg));
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('order:location');
        socketRef.current.off('order:status');
        socketRef.current.off('notification');
        socketRef.current.off('message'); // Clean up correctly
        socketRef.current.off('connect');
        socketRef.current.off('reconnect');
      }
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      socketRef.current = null;
      pendingRooms.clear();
      pageChatHandlersRef.current.clear();
    }
  }, [isAuthenticated]);

  const emitIfConnected = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Not connected, queuing: ${event}`, data);
    }
  }, []);

  const joinOrderRoom = useCallback((orderId) => {
    if (!orderId) return;
    pendingRooms.add(orderId);

    if (socketRef.current?.connected) {
      socketRef.current.emit('order:track', { orderId });
    }
  }, []);

  const leaveOrderRoom = useCallback((orderId) => {
    if (!orderId) return;
    pendingRooms.delete(orderId);
    socketRef.current?.emit('order:untrack', { orderId });
  }, []);

  const goOnline = useCallback(() => {
    emitIfConnected('driver:online', {});
  }, [emitIfConnected]);

  const updateLocation = useCallback((lat, lng, orderId) => {
    if (!lat || !lng) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver:location', { lat, lng, orderId });
    }
  }, []);

  const sendChatMessage = useCallback((orderId, message, senderRole) => {
    emitIfConnected('chat:send', { orderId, message, senderRole });
  }, [emitIfConnected]);

  // ── CRITICAL FIX: Smart Event Hook Handler Subscription ──
  const onChatMessage = useCallback((handler) => {
    // Add handler to our active set immediately, even if socket isn't ready yet
    pageChatHandlersRef.current.add(handler);

    // If the socket is ready, explicitly make sure the channel listener is listening
    if (socketRef.current) {
      socketRef.current.off('message', handler); 
      socketRef.current.on('message', handler);
    }

    // Clean up correctly when the component unmounts
    return () => {
      pageChatHandlersRef.current.delete(handler);
      if (socketRef.current) {
        socketRef.current.off('message', handler);
      }
    };
  }, []);

// new support socked connection 
  const joinSupportTicket = useCallback((ticketId) => {
    if (!ticketId) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('support:join', { ticketId });
      console.log(`[Socket] Joined support ticket room: ${ticketId}`);
    }
  }, []);

  const leaveSupportTicket = useCallback((ticketId) => {
    if (!ticketId) return;
    socketRef.current?.emit('support:leave', { ticketId });
    console.log(`[Socket] Left support ticket room: ${ticketId}`);
  }, []);

  const sendSupportMessage = useCallback((ticketId, message, senderType = 'customer') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('support:message', { ticketId, message, senderType });
    } else {
      console.warn('[Socket] Cannot send support message: socket disconnected');
    }
  }, []);

  return {
    trackOrder: joinOrderRoom,
    untrackOrder: leaveOrderRoom,
    joinOrderRoom,
    leaveOrderRoom,
    goOnline,
    updateLocation,
    sendChatMessage,
    onChatMessage,

    joinSupportTicket,
    leaveSupportTicket,
    sendSupportMessage
  };
};