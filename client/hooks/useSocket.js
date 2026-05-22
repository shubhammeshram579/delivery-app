'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import {
  updateDriverLocation,
  updateOrderStatusRealtime,
} from '../redux/slices/orderSlice';

import { addNotification } from '../redux/slices/notificationSlice';
import toast from 'react-hot-toast';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const useSocket = () => {
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(
    (state) => state?.auth?.isAuthenticated ?? false
  );

  const socketRef = useRef(null);

  // ===============================
  // CONNECT SOCKET
  // ===============================
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = Cookies.get('accessToken');
    if (!token) return;

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

      // ===============================
      // CONNECT EVENTS
      // ===============================
      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
      });

      // ===============================
      // ORDER LOCATION
      // ===============================
      socket.off('order:location').on('order:location', (data) => {
        dispatch(updateDriverLocation(data));
      });

      // ===============================
      // ORDER STATUS
      // ===============================
      socket.off('order:status').on('order:status', (data) => {
        dispatch(updateOrderStatusRealtime(data));
      });

      // ===============================
      // NOTIFICATIONS
      // ===============================
      socket.off('notification').on('notification', (notification) => {
        dispatch(addNotification(notification));

        toast(notification.body, {
          icon:
            notification.type === 'payment'
              ? '💳'
              : notification.type === 'order'
              ? '📦'
              : '🔔',
          duration: 4000,
        });
      });

      // ===============================
      // CHAT MESSAGE (GLOBAL DEBUG + SAFE)
      // ===============================
      socket.off('chat:message').on('chat:message', (msg) => {
        console.log('[Socket] chat message:', msg);
      });
    });

    // ===============================
    // CLEANUP ON UNMOUNT
    // ===============================
    return () => {
      if (socketRef.current) {
        socketRef.current.off('order:location');
        socketRef.current.off('order:status');
        socketRef.current.off('notification');
        socketRef.current.off('chat:message');
      }
    };
  }, [isAuthenticated, dispatch]);

  // ===============================
  // DISCONNECT ON LOGOUT
  // ===============================
  useEffect(() => {
    if (!isAuthenticated && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      socketRef.current = null;
    }
  }, [isAuthenticated]);

  // ===============================
  // SAFE EMIT HELPER
  // ===============================
  const emitIfConnected = useCallback((event, data) => {
    if (!socketRef.current?.connected) {
      console.warn(`[Socket] Not connected → ${event}`);
      return;
    }

    socketRef.current.emit(event, data);
  }, []);

  // ===============================
  // TRACK ORDER
  // ===============================
  const trackOrder = useCallback(
    (orderId) => {
      emitIfConnected('order:track', { orderId });
    },
    [emitIfConnected]
  );

  const untrackOrder = useCallback(
    (orderId) => {
      emitIfConnected('order:untrack', { orderId });
    },
    [emitIfConnected]
  );

  // ===============================
  // DRIVER ONLINE
  // ===============================
  const goOnline = useCallback(() => {
    emitIfConnected('driver:online', {});
  }, [emitIfConnected]);

  // ===============================
  // LOCATION UPDATE
  // ===============================
  const updateLocation = useCallback(
    (lat, lng, orderId) => {
      emitIfConnected('driver:location', {
        lat,
        lng,
        orderId,
      });
    },
    [emitIfConnected]
  );

  // ===============================
  // CHAT SEND
  // ===============================
  const sendChatMessage = useCallback(
    (orderId, message, senderRole) => {
      emitIfConnected('chat:send', {
        orderId,
        message,
        senderRole,
      });
    },
    [emitIfConnected]
  );

  // ===============================
  // CHAT LISTENER (PAGE LEVEL USE)
  // ===============================
  const onChatMessage = useCallback((handler) => {
    if (!socketRef.current) return () => {};

    socketRef.current.off('chat:message', handler);
    socketRef.current.on('chat:message', handler);

    return () => {
      socketRef.current?.off('chat:message', handler);
    };
  }, []);

  const joinOrderRoom = useCallback((orderId) => {
  socketRef.current?.emit('order:track', { orderId });
}, []);


const leaveOrderRoom = useCallback((orderId) => {
  socketRef.current?.emit('order:untrack', { orderId });
}, []);




  return {
    trackOrder,
    untrackOrder,
    goOnline,
    updateLocation,
    sendChatMessage,
    onChatMessage,
    joinOrderRoom,
    leaveOrderRoom
  };
};