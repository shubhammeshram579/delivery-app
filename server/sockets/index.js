const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Driver, ChatMessage,Order, User } = require('../models');
const { cacheSet } = require('../config/redis');
const { setIo } = require('../utils/notifications');
const logger = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ===============================
  // AUTH MIDDLEWARE
  // ===============================
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.id;

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ===============================
  // CONNECTION
  // ===============================
  io.on('connection', async (socket) => {
    logger.info(`Socket connected: ${socket.id} user:${socket.userId}`);

    // Prevent duplicate joins
    socket.join(`user:${socket.userId}`);
    

    // ===============================
    // DRIVER ONLINE
    // ===============================
    socket.on('driver:online', async () => {
      await Driver.update(
        { isOnline: true, isAvailable: true },
        { where: { userId: socket.userId } }
      ).catch(() => {});
    });

    // ===============================
    // DRIVER LOCATION
    // ===============================
    socket.on('driver:location', async ({ lat, lng, orderId }) => {
      await Driver.update(
        { currentLat: lat, currentLng: lng },
        { where: { userId: socket.userId } }
      ).catch(() => {});

      await cacheSet(`dloc:${socket.userId}`, { lat, lng }, 30);

      if (orderId) {
        io.to(`order:${orderId}`).emit('order:location', {
          lat,
          lng,
          driverId: socket.userId,
          orderId,
        });
      }
    });

    // ===============================
    // ORDER TRACKING ROOM
    // ===============================
    socket.on('order:track', ({ orderId }) => {
      socket.join(`order:${orderId}`);
      logger.info(`User ${socket.userId} joined order:${orderId}`);
    });

    socket.on('order:untrack', ({ orderId }) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('chat:send', async (payload, callback) => {
  try {

    const { orderId, message, senderRole } = payload;

    if (!message?.trim() || !orderId) {

      callback?.({
        success: false,
        error: 'Invalid data',
      });

      return;
    }

    // Ensure sender joined room
    socket.join(`order:${orderId}`);

    // Get order details

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name'],
        },
        {
          model: Driver,
          as: 'driver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (!order) {

      callback?.({
        success: false,
        error: 'Order not found',
      });

      return;
    }

    // Save message
    const msg = await ChatMessage.create({
      orderId,
      senderId: socket.userId,
      senderRole: senderRole || 'customer',
      message: message.trim(),
    });

    const response = {
      id: msg.id,
      orderId,
      senderId: socket.userId,
      senderRole: msg.senderRole,
      message: msg.message,
      createdAt: msg.createdAt,
    };

    // Realtime emit to room
    io.to(`order:${orderId}`).emit('chat:message', response);

    /*
      ==========================
      SEND NOTIFICATION
      ==========================
    */

    const { sendNotification } = require('../utils/notifications');

    // CUSTOMER -> DRIVER
    if (
      senderRole === 'customer' &&
      order.driver?.user?.id
    ) {

      await sendNotification(order.driver.user.id, {
        title: 'New Message',
        body: `${order.customer.name}: ${message}`,
        type: 'chat',
        data: {
          orderId,
          senderId: socket.userId,
        },
      });

    }

    // DRIVER -> CUSTOMER
    if (
      senderRole === 'driver' &&
      order.customer?.id
    ) {

      await sendNotification(order.customer.id, {
        title: 'Driver Message',
        body: `${order.driver?.user?.name || 'Driver'}: ${message}`,
        type: 'chat',
        data: {
          orderId,
          senderId: socket.userId,
        },
      });

    }

    callback?.({
      success: true,
      data: response,
    });

  } catch (err) {

    logger.error('Chat send error:', err);

    callback?.({
      success: false,
      error: 'Chat failed',
    });

  }
});

    // ===============================
    // CHAT READ RECEIPT
    // ===============================
    socket.on('chat:read', async ({ orderId }) => {
      try {
        await ChatMessage.update(
          { isRead: true },
          {
            where: {
              orderId,
              senderId: { [Op.ne]: socket.userId },
              isRead: false,
            },
          }
        );

        io.to(`order:${orderId}`).emit('chat:read', {
          orderId,
          readBy: socket.userId,
        });

      } catch (err) {
        logger.error('Chat read error:', err.message);
      }
    });

    // ===============================
    // DISCONNECT
    // ===============================
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      await Driver.update(
        { isOnline: false },
        { where: { userId: socket.userId } }
      ).catch(() => {});
    });
  });

  setIo(io);
  logger.info('Socket.IO initialized');
  return io;
};

const getIo = () => io;

module.exports = { initSocket, getIo };