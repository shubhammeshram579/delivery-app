const paymentService = require('../services/payment.service');

const createOrder = async (req, res) => {
  const data = await paymentService.createRazorpayOrder(req.params.orderId, req.user.id);
  res.json({ success: true, data });
};

const verifyPayment = async (req, res) => {
  const data = await paymentService.verifyPayment(req.body);
  res.json({ success: true, ...data });
};

const webhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const data = await paymentService.handleWebhook(req.body, signature);
  res.json(data);
};

const refund = async (req, res) => {
  const data = await paymentService.initiateRefund(req.params.orderId, req.user.id);
  res.json({ success: true, ...data });
};

module.exports = { createOrder, verifyPayment, webhook, refund };
