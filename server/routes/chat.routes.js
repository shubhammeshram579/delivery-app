const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { ChatMessage, Order, User,Driver } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, AuthorizationError } = require('../middleware/error.middleware');

const { sendNotification } = require("../utils/notifications");

router.use(protect);



// POST /api/chat/:orderId
router.post('/:orderId', async (req, res) => {
  try {

    const { orderId } = req.params;
    const { message, senderRole } = req.body;

    console.log(req.body)

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const isCustomer = order.customerId === req.user.id;

    const isDriver =
      order.driver && order.driver.userId === req.user.id;

    if (!isCustomer && !isDriver) {
      throw new AuthorizationError('Unauthorized');
    }

    // Get order with customer & driver
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name']
        },
        {
          model: Driver,
          as: 'driver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Save message
    const msg = await ChatMessage.create({
      orderId,
      senderId: req.user.id,
      senderRole: senderRole || req.user.role,
      message: message.trim(),
    });

    // Socket emit
    const { getIo } = require('../sockets');
    const io = getIo();

    if (io) {
      io.to(`order:${orderId}`).emit('chat:message', {
        id: msg.id,
        orderId,
        senderId: req.user.id,
        senderRole: msg.senderRole,
        message: msg.message,
        createdAt: msg.createdAt,
      });
    }

    /*
      =========================
      SEND PUSH NOTIFICATION
      =========================
    */

    // Customer -> Driver
    if (req.user.role === 'customer' && order.driver?.user?.id) {

      await sendNotification(order.driver.user.id, {
        title: 'New Message',
        body: `${order.customer.name}: ${message}`,
        type: 'chat',
        data: {
          orderId,
          senderId: req.user.id,
        },
      });

    }

    // Driver -> Customer
    if (req.user.role === 'driver' && order.customer?.id) {

      await sendNotification(order.customer.id, {
        title: 'Driver Message',
        body: `${req.user.name || 'Driver'}: ${message}`,
        type: 'chat',
        data: {
          orderId,
          senderId: req.user.id,
        },
      });

    }

    return res.status(201).json({
      success: true,
      data: {
        message: msg
      }
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
});


// GET /api/chat/:orderId — load message history
router.get('/:orderId', async (req, res) => {
  try {

    const { orderId } = req.params;

    // First fetch order
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id'],
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'userId'],
        },
      ],
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Authorization check
    const isCustomer = order.customerId === req.user.id;

    const isDriver =
      order.driver &&
      order.driver.userId === req.user.id;

    if (!isCustomer && !isDriver) {
      throw new AuthorizationError('Unauthorized');
    }

    // Load messages
    const messages = await ChatMessage.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    res.json({
      success: true,
      data: { messages },
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PATCH /api/chat/:orderId/read — mark messages as read
router.patch('/:orderId/read', async (req, res) => {
  const { orderId } = req.params;

  await ChatMessage.update(
    { isRead: true },
    {
      where: {
        orderId,
        senderId: { [Op.ne]: req.user.id },
        isRead:   false,
      },
    }
  );

  res.json({ success: true, message: 'Messages marked as read' });
});

// GET /api/chat/conversations/list — all active chats for this user
router.get('/conversations/list', async (req, res) => {
  const { Op, fn, col, literal } = require('sequelize');

  // Find all orders this user is involved in that have messages
  const where = req.user.role === 'customer'
    ? { customerId: req.user.id }
    : { '$driver.userId$': req.user.id };

  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ['accepted', 'picked_up', 'in_transit', 'delivered'] },
      customerId: req.user.role === 'customer' ? req.user.id : { [Op.ne]: null },
    },
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name', 'avatar'] },
      {
        model: require('../models').Driver,
        as: 'driver',
        required: req.user.role === 'driver',
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

  res.json({ success: true, data: { conversations: orders } });
});

module.exports = router;