const { Notification } = require('../models');
const logger = require('./logger');

let io; // Will be set by socket init

const setIo = (socketIo) => {
  io = socketIo;
};

const sendNotification = async (userId, { title, body, type = 'system', data = {} }) => {
  try {
    // Persist to DB
    await Notification.create({ userId, title, body, type, data });

    // Emit real-time if user is connected
    if (io) {
      io.to(`user:${userId}`).emit('notification', { title, body, type, data });
    }
  } catch (error) {
    logger.error('Notification send failed:', error);
  }
};

module.exports = { sendNotification, setIo };
