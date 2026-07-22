const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.createRazorpayOrder(req.params.orderId, req.user.id);
  res.json({ success: true, data });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.verifyPayment(req.body);
  res.json({ success: true, ...data });
});

const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const data = await paymentService.handleWebhook(req.body, signature);
  res.json(data);
});

const refund = asyncHandler(async (req, res) => {
  const data = await paymentService.initiateRefund(req.params.orderId, req.user.id);
  res.json({ success: true, ...data });
});

module.exports = { createOrder, verifyPayment, webhook, refund };