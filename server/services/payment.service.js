const crypto = require('crypto');
const { Payment, Order } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/error.middleware');
const { sendNotification } = require('../utils/notifications');

// Lazy init - only create when actually used so missing env doesn't crash startup

let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    const Razorpay = require('razorpay');
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

const createRazorpayOrder = async (orderId, customerId) => {
  const order = await Order.findOne({
    where: { id: orderId, customerId },
    include: [{ association: 'payment' }],
  });
  if (!order) throw new NotFoundError('Order');
  if (order.payment?.status === 'success') throw new ValidationError('Order already paid');

  const amount = Math.round(order.totalAmount * 100);
  const rzpOrder = await getRazorpay().orders.create({
    amount,
    currency: 'INR',
    receipt: `rcpt_${order.orderNumber}`,
    notes: { orderId: order.id, customerId },
  });

  await Payment.update({ razorpayOrderId: rzpOrder.id }, { where: { orderId } });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

const verifyPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }) => {
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature)
    throw new ValidationError('Payment verification failed: signature mismatch');

  const payment = await Payment.findOne({ where: { orderId } });
  if (!payment) throw new NotFoundError('Payment');

  await payment.update({
    status: 'success',
    razorpayPaymentId,
    razorpaySignature,
    paidAt: new Date(),
  });

  const order = await Order.findByPk(orderId);
  await sendNotification(order.customerId, {
    title: 'Payment successful',
    body: `Payment of ₹${order.totalAmount} received for order #${order.orderNumber}`,
    type: 'payment',
    data: { orderId },
  });

  return { message: 'Payment verified successfully', payment };
};




const handleWebhook = async (rawBody, signature) => {

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');


    // console.log(expectedSignature);

  if (expectedSignature !== signature)
    throw new ValidationError('Webhook signature mismatch');

  const event = JSON.parse(rawBody.toString());
  if (event.event === 'payment.failed') {
    const { order_id } = event.payload.payment.entity;
    const payment = await Payment.findOne({ where: { razorpayOrderId: order_id } });
    if (payment) await payment.update({ status: 'failed' });
  }
  return { received: true };
};

const initiateRefund = async (orderId) => {
  const payment = await Payment.findOne({ where: { orderId, status: 'success' } });
  if (!payment) throw new NotFoundError('Paid payment');

  const refund = await getRazorpay().payments.refund(payment.razorpayPaymentId, {
    amount: Math.round(payment.amount * 100),
    notes: { reason: 'Order cancelled', orderId },
  });

  await payment.update({ status: 'refunded', refundId: refund.id, refundedAt: new Date() });
  return { message: 'Refund initiated', refundId: refund.id };
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook, initiateRefund };
