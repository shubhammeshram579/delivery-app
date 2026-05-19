const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Driver, Order } = require('../models');
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

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Driver goes online
    socket.on('driver:online', async () => {
      socket.join('drivers');
      await Driver.update(
        { isOnline: true, isAvailable: true },
        { where: { userId: socket.userId } }
      );
    });

    // Driver location update
    socket.on('driver:location', async ({ lat, lng, orderId, speed, heading }) => {
      await Driver.update(
        { currentLat: lat, currentLng: lng },
        { where: { userId: socket.userId } }
      );
      await cacheSet(`driver:location:${socket.userId}`, { lat, lng, updatedAt: Date.now() }, 30);

      if (orderId) {
        io.to(`order:${orderId}`).emit('order:location', {
          lat, lng, speed, heading,
          driverId: socket.userId,
          orderId,
        });
      }
    });

    // Customer tracks order
    socket.on('order:track', ({ orderId }) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('order:untrack', ({ orderId }) => {
      socket.leave(`order:${orderId}`);
    });

    // Chat
    socket.on('chat:send', async ({ orderId, message, senderRole }) => {
      const { ChatMessage } = require('../models');
      const msg = await ChatMessage.create({
        orderId,
        senderId: socket.userId,
        senderRole,
        message,
      });
      io.to(`order:${orderId}`).emit('chat:message', {
        id: msg.id,
        orderId,
        senderId: socket.userId,
        senderRole,
        message,
        createdAt: msg.createdAt,
      });
    });

    // Mark chat read - FIXED: use Sequelize Op.ne not $ne
    socket.on('chat:read', async ({ orderId }) => {
      const { ChatMessage } = require('../models');
      await ChatMessage.update(
        { isRead: true },
        {
          where: {
            orderId,
            senderId: { [Op.ne]: socket.userId },
          },
        }
      );
      io.to(`order:${orderId}`).emit('chat:read', { orderId, readBy: socket.userId });
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      await Driver.update(
        { isOnline: false, isAvailable: false },
        { where: { userId: socket.userId } }
      ).catch(() => {}); // Ignore if not a driver
    });
  });

  setIo(io);
  logger.info('Socket.IO initialised');
  return io;
};

module.exports = { initSocket, getIo: () => io };
