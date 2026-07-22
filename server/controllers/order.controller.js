const orderService = require("../services/order.service");
const { Order, User, Driver, Payment } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require("../middleware/error.middleware");

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: { order },
  });
});

const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, orderNumber } = req.query;

  const data = await orderService.getOrders({
    role: req.user.role,
    userId: req.user.id,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    status,
    orderNumber,
  });

  res.json({ success: true, data });
});

const getOrderById = asyncHandler(async (req, res) => {
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
});

const acceptOrder = asyncHandler(async (req, res) => {
  const order = await orderService.acceptOrder(req.params.id, req.user.id);
  res.json({ success: true, message: "Order accepted", data: { order } });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, deliveryProofImage } = req.body;
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.user.id,
    status,
    { deliveryProofImage }
  );

  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: { order },
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.id,
    req.user.id,
    req.body.reason
  );

  res.json({ success: true, message: "Order cancelled", data: { order } });
});

const rateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);

  if (!order || String(order.customerId) !== String(req.user.id)) {
    throw new AuthorizationError("Not allowed to rate this order");
  }

  if (order.status !== "delivered") {
    throw new ValidationError("Can only rate delivered orders");
  }

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
          ((driver.rating * driver.totalRatings + req.body.rating) / total).toFixed(2)
        ),
        totalRatings: total,
      });
    }
  }

  res.json({ success: true, message: "Rating submitted" });
});

// ── Upload delivery proof ─────────────────────────────
const uploadDeliveryProof = asyncHandler(async (req, res) => {
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
});

// ── Cash collected ────────────────────────────────────
const markCashCollected = asyncHandler(async (req, res) => {
  await orderService.markCashCollected(req.params.id, req.user.id);

  res.json({
    success: true,
    message: "Cash collection confirmed",
  });
});

// ── Generate pickup OTP ───────────────────────────────
const generatePickupOtp = asyncHandler(async (req, res) => {
  await orderService.generatePickupOtp(req.params.id, req.user.id);

  res.json({
    success: true,
    message: "OTP sent to customer",
  });
});

// ── Verify pickup OTP ─────────────────────────────────
const verifyPickupOtp = asyncHandler(async (req, res) => {
  await orderService.verifyPickupOtp(
    req.params.id,
    req.user.id,
    req.body.otp
  );

  res.json({
    success: true,
    message: "Pickup verified",
  });
});

const generateDeliveryOtp = asyncHandler(async (req, res) => {
  await orderService.generateDeliveryOtp(req.params.id, req.user.id);

  res.json({
    success: true,
    message: "OTP sent to order receiver",
  });
});

const verifyDeliveryOtp = asyncHandler(async (req, res) => {
  await orderService.verifyDeliveryOtp(
    req.params.id,
    req.user.id,
    req.body.otp
  );

  res.json({
    success: true,
    message: "Order receiver verified",
  });
});

const getOrderLiveLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const locationData = await orderService.getOrderLiveLocationService(id);

  return res.status(200).json({
    success: true,
    data: locationData,
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  acceptOrder,
  updateStatus,
  cancelOrder,
  rateOrder,
  uploadDeliveryProof,
  markCashCollected,
  generatePickupOtp,
  verifyPickupOtp,
  generateDeliveryOtp,
  verifyDeliveryOtp,
  getOrderLiveLocation,
};