// 'use client';

// import { useEffect, useRef, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import Cookies from 'js-cookie';
// import {
//   updateDriverLocation,
//   updateOrderStatusRealtime,
// } from '../redux/slices/orderSlice';

// import { addNotification } from '../redux/slices/notificationSlice';
// import toast from 'react-hot-toast';

// const SOCKET_URL =
//   process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// let socketInstance = null;

// export const useSocket = () => {
//   const dispatch = useDispatch();

//   const isAuthenticated = useSelector(
//     (state) => state?.auth?.isAuthenticated ?? false
//   );

//   const socketRef = useRef(null);

//   // ===============================
//   // CONNECT SOCKET
//   // ===============================
//   useEffect(() => {
//     if (!isAuthenticated) return;

//     const token = Cookies.get('accessToken');
//     if (!token) return;

//     import('socket.io-client').then(({ io }) => {
//       if (!socketInstance) {
//         socketInstance = io(SOCKET_URL, {
//           auth: { token },
//           transports: ['websocket'],
//           reconnection: true,
//           reconnectionDelay: 1000,
//           reconnectionAttempts: 5,
//         });
//       }

//       socketRef.current = socketInstance;
//       const socket = socketInstance;

//       // ===============================
//       // CONNECT EVENTS
//       // ===============================
//       // socket.on('connect', () => {
//       //   console.log('[Socket] Connected:', socket.id);
//       // });

//       socket.on('connect', () => {
//   console.log('[Socket] Connected:', socket.id);

//   if (window.currentOrderId) {
//     socket.emit('order:track', {
//       orderId: window.currentOrderId,
//     });
//   }
// });

//       socket.on('connect_error', (err) => {
//         console.warn('[Socket] Connection error:', err.message);
//       });

//       // ===============================
//       // ORDER LOCATION
//       // ===============================
//       socket.off('order:location').on('order:location', (data) => {
//         console.log('LOCATION RECEIVED:', data);
//         dispatch(updateDriverLocation(data));
//       });

//       // ===============================
//       // ORDER STATUS
//       // ===============================
//       socket.off('order:status').on('order:status', (data) => {
//         dispatch(updateOrderStatusRealtime(data));
//       });

//       // ===============================
//       // NOTIFICATIONS
//       // ===============================
//       socket.off('notification').on('notification', (notification) => {
//         dispatch(addNotification(notification));

//         toast(notification.body, {
//           icon:
//             notification.type === 'payment'
//               ? '💳'
//               : notification.type === 'order'
//               ? '📦'
//               : '🔔',
//           duration: 4000,
//         });
//       });

//       // ===============================
//       // CHAT MESSAGE (GLOBAL DEBUG + SAFE)
//       // ===============================
//       socket.off('chat:message').on('chat:message', (msg) => {
//         console.log('[Socket] chat message:', msg);
//       });
//     });

//     // ===============================
//     // CLEANUP ON UNMOUNT
//     // ===============================
//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off('order:location');
//         socketRef.current.off('order:status');
//         socketRef.current.off('notification');
//         socketRef.current.off('chat:message');
//       }
//     };
//   }, [isAuthenticated, dispatch]);

//   // ===============================
//   // DISCONNECT ON LOGOUT
//   // ===============================
//   useEffect(() => {
//     if (!isAuthenticated && socketInstance) {
//       socketInstance.disconnect();
//       socketInstance = null;
//       socketRef.current = null;
//     }
//   }, [isAuthenticated]);

//   // ===============================
//   // SAFE EMIT HELPER
//   // ===============================
//   const emitIfConnected = useCallback((event, data) => {
//     if (!socketRef.current?.connected) {
//       console.warn(`[Socket] Not connected → ${event}`);
//       return;
//     }

//     socketRef.current.emit(event, data);
//   }, []);

//   // ===============================
//   // TRACK ORDER
//   // ===============================
//   const trackOrder = useCallback(
//     (orderId) => {
//       emitIfConnected('order:track', { orderId });
//     },
//     [emitIfConnected]
//   );

//   const untrackOrder = useCallback(
//     (orderId) => {
//       emitIfConnected('order:untrack', { orderId });
//     },
//     [emitIfConnected]
//   );

//   // ===============================
//   // DRIVER ONLINE
//   // ===============================
//   const goOnline = useCallback(() => {
//     emitIfConnected('driver:online', {});
//   }, [emitIfConnected]);

//   // ===============================
//   // LOCATION UPDATE
//   // ===============================
//   const updateLocation = useCallback(
//     (lat, lng, orderId) => {
//       emitIfConnected('driver:location', {
//         lat,
//         lng,
//         orderId,
//       });
//     },
//     [emitIfConnected]
//   );

//   // ===============================
//   // CHAT SEND
//   // ===============================
//   const sendChatMessage = useCallback(
//     (orderId, message, senderRole) => {
//       emitIfConnected('chat:send', {
//         orderId,
//         message,
//         senderRole,
//       });
//     },
//     [emitIfConnected]
//   );

//   // ===============================
//   // CHAT LISTENER (PAGE LEVEL USE)
//   // ===============================
//   const onChatMessage = useCallback((handler) => {
//     if (!socketRef.current) return () => {};

//     socketRef.current.off('chat:message', handler);
//     socketRef.current.on('chat:message', handler);

//     return () => {
//       socketRef.current?.off('chat:message', handler);
//     };
//   }, []);

// //   const joinOrderRoom = useCallback((orderId) => {
// //   socketRef.current?.emit('order:track', { orderId });
// // }, []);


// // const joinOrderRoom = useCallback((orderId) => {
// //   if (!socketRef.current?.connected) {
// //     console.log("Socket not connected");
// //     return;
// //   }

// //   console.log("Joining room:", orderId);

// //   socketRef.current.emit('order:track', { orderId });
// // }, []);


// const joinOrderRoom = useCallback((orderId) => {
//   console.log(
//     "JOIN ROOM REQUEST",
//     orderId,
//     socketRef.current?.connected
//   );

//   socketRef.current?.emit("order:track", {
//     orderId,
//   });
// }, []);

// const leaveOrderRoom = useCallback((orderId) => {
//   socketRef.current?.emit('order:untrack', { orderId });
// }, []);




//   return {
//     trackOrder,
//     untrackOrder,
//     goOnline,
//     updateLocation,
//     sendChatMessage,
//     onChatMessage,
//     joinOrderRoom,
//     leaveOrderRoom
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
// Queue rooms to join — if socket not ready yet, join on connect
const pendingRooms = new Set();

export const useSocket = () => {
  const dispatch    = useDispatch();
  const isAuthenticated = useSelector(s => s?.auth?.isAuthenticated ?? false);
  const socketRef   = useRef(null);

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

      // ── On connect: join any rooms that were requested before connection ──
      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        // Flush pending rooms
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
        // Re-join rooms after reconnect
        pendingRooms.forEach(orderId => {
          socket.emit('order:track', { orderId });
        });
      });

      // ── Driver location → Redux ────────────────────────────────
      socket.off('order:location').on('order:location', (data) => {
        console.log('[Socket] order:location received:', data);
        dispatch(updateDriverLocation(data));
      });

      // ── Order status update ────────────────────────────────────
      socket.off('order:status').on('order:status', (data) => {
        dispatch(updateOrderStatusRealtime(data));
      });

      // ── Notifications ──────────────────────────────────────────
      socket.off('notification').on('notification', (notification) => {
        dispatch(addNotification(notification));
        toast(notification.body, {
          icon: notification.type === 'payment' ? '💳'
              : notification.type === 'order'   ? '📦' : '🔔',
          duration: 4000,
        });
      });

      // ── Chat (global handler — page-level handlers override) ───
      socket.off('chat:message').on('chat:message', (msg) => {
        // handled at page level via onChatMessage
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('order:location');
        socketRef.current.off('order:status');
        socketRef.current.off('notification');
        socketRef.current.off('connect');
        socketRef.current.off('reconnect');
      }
    };
  }, [isAuthenticated, dispatch]);

  // ── Disconnect on logout ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      socketRef.current = null;
      pendingRooms.clear();
    }
  }, [isAuthenticated]);

  // ── Emit helper ───────────────────────────────────────────────
  const emitIfConnected = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Not connected, queuing: ${event}`, data);
    }
  }, []);

  // ── Join order tracking room ──────────────────────────────────
  // KEY FIX: store in pendingRooms so it gets joined on connect too
  const joinOrderRoom = useCallback((orderId) => {
    if (!orderId) return;
    pendingRooms.add(orderId);

    if (socketRef.current?.connected) {
      socketRef.current.emit('order:track', { orderId });
      console.log('[Socket] joinOrderRoom (immediate):', orderId);
    } else {
      console.log('[Socket] joinOrderRoom (queued for connect):', orderId);
    }
  }, []);

  const leaveOrderRoom = useCallback((orderId) => {
    if (!orderId) return;
    pendingRooms.delete(orderId);
    socketRef.current?.emit('order:untrack', { orderId });
  }, []);

  // ── Driver helpers ────────────────────────────────────────────
  const goOnline = useCallback(() => {
    emitIfConnected('driver:online', {});
  }, [emitIfConnected]);

  // KEY FIX: always emit even if map is rendering
  const updateLocation = useCallback((lat, lng, orderId) => {
    if (!lat || !lng) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver:location', { lat, lng, orderId });
    }
  }, []);

  // ── Chat ──────────────────────────────────────────────────────
  const sendChatMessage = useCallback((orderId, message, senderRole) => {
    emitIfConnected('chat:send', { orderId, message, senderRole });
  }, [emitIfConnected]);

  const onChatMessage = useCallback((handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.off('chat:message', handler);
    socketRef.current.on('chat:message', handler);
    return () => socketRef.current?.off('chat:message', handler);
  }, []);

  // Legacy aliases
  const trackOrder   = joinOrderRoom;
  const untrackOrder = leaveOrderRoom;

  return {
    trackOrder,
    untrackOrder,
    joinOrderRoom,
    leaveOrderRoom,
    goOnline,
    updateLocation,
    sendChatMessage,
    onChatMessage,
  };
};