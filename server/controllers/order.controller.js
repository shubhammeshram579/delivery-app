const orderService = require('../services/order.service');

const createOrder = async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Order placed successfully', data: { order } });
};

const getOrders = async (req, res) => {

  console.log(req.user.id)
  
  const { page, limit, status } = req.query;
  const data = await orderService.getOrders({
    role: req.user.role,
    userId: req.user.id,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    status,
  });
  res.json({ success: true, data });
};

const getOrderById = async (req, res) => {
  const { Order, User, Driver, Payment } = require('../models');
  const { NotFoundError } = require('../middleware/error.middleware');

  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'avatar'] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'avatar'] }] },
      { model: Payment, as: 'payment' },
    ],
  });

  if (!order) throw new NotFoundError('Order');
  res.json({ success: true, data: { order } });
};

const acceptOrder = async (req, res) => {

  // console.log("req.user.id",req.user.id)
  const order = await orderService.acceptOrder(req.params.id, req.user.id);
  // const order = await orderService.acceptOrder(req.params.id);
  res.json({ success: true, message: 'Order accepted', data: { order } });
};

const updateStatus = async (req, res) => {
  const { status, deliveryProofImage } = req.body;
  const order = await orderService.updateOrderStatus(req.params.id, req.user.id, status, { deliveryProofImage });
  res.json({ success: true, message: `Order status updated to ${status}`, data: { order } });
};

const cancelOrder = async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.id, req.body.reason);
  res.json({ success: true, message: 'Order cancelled', data: { order } });
};

const rateOrder = async (req, res) => {
  const { Order, Driver } = require('../models');
  const { NotFoundError, AuthorizationError } = require('../middleware/error.middleware');

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new NotFoundError('Order');
  if (String(order.customerId) !== String(req.user.id)) throw new AuthorizationError();
  if (order.status !== 'delivered') throw new Error('Can only rate delivered orders');

  const { rating, review } = req.body;
  await order.update({ customerRating: rating, customerReview: review });

  // Update driver avg rating
  const driver = await Driver.findByPk(order.driverId);
  if (driver) {
    const newTotal = driver.totalRatings + 1;
    const newRating = ((driver.rating * driver.totalRatings) + rating) / newTotal;
    await driver.update({ rating: parseFloat(newRating.toFixed(2)), totalRatings: newTotal });
  }

  res.json({ success: true, message: 'Rating submitted' });
};

module.exports = { createOrder, getOrders, getOrderById, acceptOrder, updateStatus, cancelOrder, rateOrder };
