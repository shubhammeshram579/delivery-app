const { ChatMessage, Order, User, Driver } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, AuthorizationError } = require('../middleware/error.middleware');
const { sendNotification } = require("../utils/notifications");

// Private helper for asynchronous push notifications
const _handlePushNotification = async ({ order, message, user, orderId }) => {
  try {
    // Customer -> Driver notification
    if (user.role === 'customer' && order.driver?.user?.id) {
      await sendNotification(order.driver.user.id, {
        title: 'New Message',
        body: `${order.customer.name}: ${message}`,
        type: 'chat',
        data: { orderId, senderId: user.id },
      });
    }

    // Driver -> Customer notification
    if (user.role === 'driver' && order.customer?.id) {
      await sendNotification(order.customer.id, {
        title: 'Driver Message',
        body: `${user.name || 'Driver'}: ${message}`,
        type: 'chat',
        data: { orderId, senderId: user.id },
      });
    }
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
};

const sendMessage = async ({ orderId, message, senderRole, user }) => {
  // 1. Fetch order details with relational mappings
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name'] },
      {
        model: Driver,
        as: 'driver',
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
      }
    ]
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  // 2. Authorization Check
  const isCustomer = order.customerId === user.id;
  const isDriver = order.driver && order.driver.userId === user.id;

  if (!isCustomer && !isDriver) {
    throw new AuthorizationError('Unauthorized');
  }

  // 3. Save Message to Database
  const msg = await ChatMessage.create({
    orderId,
    senderId: user.id,
    senderRole: senderRole || user.role,
    message: message.trim(),
  });

  // 4. Socket.io Event Emission
  const { getIo } = require('../sockets');
  const io = getIo();
  if (io) {
    io.to(`order:${orderId}`).emit('chat:message', {
      id: msg.id,
      orderId,
      senderId: user.id,
      senderRole: msg.senderRole,
      message: msg.message,
      createdAt: msg.createdAt,
    });
  }

  // 5. Fire off push notifications background process
  _handlePushNotification({ order, message, user, orderId });

  return msg;
};

const getMessageHistory = async ({ orderId, user }) => {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'customer', attributes: ['id'] },
      { model: Driver, as: 'driver', attributes: ['id', 'userId'] },
    ],
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  const isCustomer = order.customerId === user.id;
  const isDriver = order.driver && order.driver.userId === user.id;

  if (!isCustomer && !isDriver) {
    throw new AuthorizationError('Unauthorized');
  }

  return await ChatMessage.findAll({
    where: { orderId },
    order: [['createdAt', 'ASC']],
    limit: 100,
  });
};

const markMessagesAsRead = async ({ orderId, userId }) => {
  return await ChatMessage.update(
    { isRead: true },
    {
      where: {
        orderId,
        senderId: { [Op.ne]: userId },
        isRead: false,
      },
    }
  );
};

const getConversationsList = async ({ user }) => {
  return await Order.findAll({
    where: {
      status: { [Op.in]: ['accepted', 'picked_up', 'in_transit', 'delivered'] },
      customerId: user.role === 'customer' ? user.id : { [Op.ne]: null },
    },
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name', 'avatar'] },
      {
        model: Driver,
        as: 'driver',
        required: user.role === 'driver',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
      },
      {
        model: ChatMessage,
        as: 'messages',
        required: true,
        limit: 1,
        order: [['createdAt', 'DESC']],
      },
    ],
    limit: 20,
  });
};

module.exports = {
  sendMessage,
  getMessageHistory,
  markMessagesAsRead,
  getConversationsList
};