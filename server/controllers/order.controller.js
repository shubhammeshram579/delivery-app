// const orderService = require('../services/order.service');

// const createOrder = async (req, res) => {
//   const order = await orderService.createOrder(req.user.id, req.body);
//   res.status(201).json({ success: true, message: 'Order placed successfully', data: { order } });
// };

// const getOrders = async (req, res) => {

//   console.log(req.user.id)

//   const { page, limit, status } = req.query;
//   const data = await orderService.getOrders({
//     role: req.user.role,
//     userId: req.user.id,
//     page: parseInt(page) || 1,
//     limit: parseInt(limit) || 10,
//     status,
//   });
//   res.json({ success: true, data });
// };

// const getOrderById = async (req, res) => {
//   const { Order, User, Driver, Payment } = require('../models');
//   const { NotFoundError } = require('../middleware/error.middleware');

//   const order = await Order.findByPk(req.params.id, {
//     include: [
//       { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'avatar'] },
//       { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'avatar'] }] },
//       { model: Payment, as: 'payment' },
//     ],
//   });

//   if (!order) throw new NotFoundError('Order');
//   res.json({ success: true, data: { order } });
// };

// const acceptOrder = async (req, res) => {

//   // console.log("req.user.id",req.user.id)
//   const order = await orderService.acceptOrder(req.params.id, req.user.id);
//   // const order = await orderService.acceptOrder(req.params.id);
//   res.json({ success: true, message: 'Order accepted', data: { order } });
// };

// const updateStatus = async (req, res) => {
//   const { status, deliveryProofImage } = req.body;
//   const order = await orderService.updateOrderStatus(req.params.id, req.user.id, status, { deliveryProofImage });
//   res.json({ success: true, message: `Order status updated to ${status}`, data: { order } });
// };

// const cancelOrder = async (req, res) => {
//   const order = await orderService.cancelOrder(req.params.id, req.user.id, req.body.reason);
//   res.json({ success: true, message: 'Order cancelled', data: { order } });
// };

// const rateOrder = async (req, res) => {
//   const { Order, Driver } = require('../models');
//   const { NotFoundError, AuthorizationError } = require('../middleware/error.middleware');

//   const order = await Order.findByPk(req.params.id);
//   if (!order) throw new NotFoundError('Order');
//   if (String(order.customerId) !== String(req.user.id)) throw new AuthorizationError();
//   if (order.status !== 'delivered') throw new Error('Can only rate delivered orders');

//   const { rating, review } = req.body;
//   await order.update({ customerRating: rating, customerReview: review });

//   // Update driver avg rating
//   const driver = await Driver.findByPk(order.driverId);
//   if (driver) {
//     const newTotal = driver.totalRatings + 1;
//     const newRating = ((driver.rating * driver.totalRatings) + rating) / newTotal;
//     await driver.update({ rating: parseFloat(newRating.toFixed(2)), totalRatings: newTotal });
//   }

//   res.json({ success: true, message: 'Rating submitted' });
// };

// module.exports = { createOrder, getOrders, getOrderById, acceptOrder, updateStatus, cancelOrder, rateOrder };





const orderService = require("../services/order.service");

const { Order, User, Driver, Payment, Earnings } = require("../models");

const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require("../middleware/error.middleware");


const createOrder = async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  res
    .status(201)
    .json({
      success: true,
      message: "Order placed successfully",
      data: { order },
    });
};

const getOrders = async (req, res) => {
  // console.log(req.user.id);

  const { page, limit, status ,orderNumber } = req.query;
  // console.log("search status",status)
  // console.log("search data",orderNumber)
  const data = await orderService.getOrders({
    role: req.user.role,
    userId: req.user.id,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    status,
    orderNumber
  });
  res.json({ success: true, data });
};

const getOrderById = async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: "customer",
        attributes: ["id", "name", "phone", "avatar"],
      },
      {
        model: Driver,
        as: "driver",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "phone", "avatar"],
          },
        ],
      },
      { model: Payment, as: "payment" },
    ],
  });

  if (!order) throw new NotFoundError("Order");
  res.json({ success: true, data: { order } });
};

const acceptOrder = async (req, res) => {
  // console.log("req.user.id",req.user.id)
  const order = await orderService.acceptOrder(req.params.id, req.user.id);
  // const order = await orderService.acceptOrder(req.params.id);
  res.json({ success: true, message: "Order accepted", data: { order } });
};

const updateStatus = async (req, res) => {
  const { status, deliveryProofImage } = req.body;
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.user.id,
    status,
    { deliveryProofImage },
  );
  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: { order },
  });
};

const cancelOrder = async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.id,
    req.user.id,
    req.body.reason,
  );
  res.json({ success: true, message: "Order cancelled", data: { order } });
};

// const rateOrder = async (req, res) => {

//   const order = await Order.findByPk(req.params.id);
//   if (!order) throw new NotFoundError('Order');
//   if (String(order.customerId) !== String(req.user.id)) throw new AuthorizationError();
//   if (order.status !== 'delivered') throw new Error('Can only rate delivered orders');

//   const { rating, review } = req.body;
//   await order.update({ customerRating: rating, customerReview: review });

//   // Update driver avg rating
//   const driver = await Driver.findByPk(order.driverId);
//   if (driver) {
//     const newTotal = driver.totalRatings + 1;
//     const newRating = ((driver.rating * driver.totalRatings) + rating) / newTotal;
//     await driver.update({ rating: parseFloat(newRating.toFixed(2)), totalRatings: newTotal });
//   }

//   res.json({ success: true, message: 'Rating submitted' });
// };

const rateOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order || String(order.customerId) !== String(req.user.id))
    return res.status(403).json({ success: false, message: "Not allowed" });
  if (order.status !== "delivered")
    return res
      .status(400)
      .json({ success: false, message: "Can only rate delivered orders" });
  await order.update({
    customerRating: req.body.rating,
    customerReview: req.body.review,
  });
  if (order.driverId) {
    const driver = await Driver.findByPk(order.driverId);
    if (driver) {
      const total = driver.totalRatings + 1;
      await driver.update({
        rating: parseFloat(
          (
            (driver.rating * driver.totalRatings + req.body.rating) /
            total
          ).toFixed(2),
        ),
        totalRatings: total,
      });
    }
  }
  res.json({ success: true, message: "Rating submitted" });
};


// ── NEW: Upload delivery proof ─────────────────────────────
const uploadDeliveryProof = async (req, res) => {
  const order = await orderService.uploadDeliveryProof(
    req.params.id,
    req.user.id,
    req.file
  );

  res.json({
    success: true,
    message: "Delivery proof uploaded and order marked delivered",
    data: { order },
  });
};

// ── NEW: Cash collected ────────────────────────────────────
const markCashCollected = async (req, res) => {
  await orderService.markCashCollected(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: "Cash collection confirmed",
  });
};

// ── NEW: Generate pickup OTP ───────────────────────────────
const generatePickupOtp = async (req, res) => {
  await orderService.generatePickupOtp(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: "OTP sent to customer",
  });
};

// ── NEW: Verify pickup OTP ─────────────────────────────────
const verifyPickupOtp = async (req, res) => {
  await orderService.verifyPickupOtp(
    req.params.id,
    req.user.id,
    req.body.otp
  );

  res.json({
    success: true,
    message: "Pickup verified",
  });
};


const generateDeliveryOtp = async (req, res) => {
  await orderService.generateDeliveryOtp(
    req.params.id,
    req.user.id,
  );

  res.json({
    success: true,
    message: "OTP sent to order revicer",
  });
};



const verifyDeliveryOtp = async (req, res) => {
  await orderService.verifyDeliveryOtp(
    req.params.id,
    req.user.id,
    req.body.otp
  );

  res.json({
    success: true,
    message: "order reciver verified ",
  });
};





const getOrderLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const locationData =
      await orderService.getOrderLiveLocationService(id);

    return res.status(200).json({
      success: true,
      data: locationData,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  acceptOrder,
  updateStatus,
  cancelOrder,
  rateOrder,

  // new api
  uploadDeliveryProof,
  markCashCollected,
  generatePickupOtp,
  verifyPickupOtp,

  generateDeliveryOtp,
  verifyDeliveryOtp,

  getOrderLiveLocation
};
