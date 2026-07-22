const crypto = require('crypto');
const { Payment, Order } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/error.middleware');
const { sendNotification } = require('../utils/notifications');
const { notifyAdmins } = require("../utils/adminNotification");

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
  if (!amount || amount < 100) {
    throw new ValidationError("Invalid payment amount. Minimum amount is ₹1.");
  }

  let rzpOrder;
  try {
    rzpOrder = await getRazorpay().orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${order.orderNumber}`.slice(0, 40), // Safety check: Razorpay receipts have a 40-char limit
      notes: { orderId: order.id, customerId },
    });
  } catch (error) {
    console.error("Razorpay Order Creation API Failed:", error);
    throw new ValidationError(`Payment initialization failed: ${error.message || 'Gateway error'}`);
  }

  // Check if a payment record already exists, update it, or insert a clean fallback mapping row
  const existingPayment = await Payment.findOne({ where: { orderId } });
  if (existingPayment) {
    await existingPayment.update({ razorpayOrderId: rzpOrder.id, status: 'pending' });
  } else {
    await Payment.create({
      orderId,
      razorpayOrderId: rzpOrder.id,
      amount: order.totalAmount,
      status: 'pending'
    });
  }

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
  if (!order) throw new NotFoundError('Order mapping failed');

  try {
    await sendNotification(order.customerId, {
      title: 'Payment successful',
      body: `Payment of ₹${order.totalAmount} received for order #${order.orderNumber}`,
      type: 'payment',
      data: { orderId },
    });

    await notifyAdmins({
      title: "💳 Payment Received",
      body: `Payment of ₹${order.totalAmount} received for Order #${order.orderNumber}.`,
      type: "payment",
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amount: order.totalAmount
      }
    });
  } catch (notificationError) {
    console.error("Post-payment notification systems failed:", notificationError);
  }

  return { message: 'Payment verified successfully', payment };
};

const handleWebhook = async (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature)
    throw new ValidationError('Webhook signature mismatch');

  const event = JSON.parse(rawBody.toString());
  
  if (event.event === 'payment.failed') {
    const { order_id } = event.payload.payment.entity;
    
    const payment = await Payment.findOne({ where: { razorpayOrderId: order_id } });
    if (!payment) {
      console.warn(`[Webhook Warning] Unrecognized backend tracking for Razorpay Order: ${order_id}`);
      return { received: true };
    }

    await payment.update({ status: 'failed' });

    const order = await Order.findByPk(payment.orderId);
    if (!order) {
      console.warn(`[Webhook Warning] Failed mapping payment row ${payment.id} to an existing Order.`);
      return { received: true };
    }

    try {
      await notifyAdmins({
        title: "❌ Payment Failed",
        body: `Payment failed for Order #${order.orderNumber}.`,
        type: "payment",
        data: {
          orderId: order.id,
          paymentId: payment.id
        }
      });

      await sendNotification(order.customerId, {
        title: "Payment Failed",
        body: `Your payment for Order #${order.orderNumber} failed.`,
        type: "payment",
        data: { orderId: order.id }
      });
    } catch (notificationError) {
      console.error("Webhook notification worker failed:", notificationError);
    }
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

  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order tracking lost during refund execution');

  try {
    await notifyAdmins({
      title: "💰 Refund Initiated",
      body: `Refund initiated for Order #${order.orderNumber}.`,
      type: "payment",
      data: {
        orderId: order.id,
        refundId: refund.id
      }
    });

    await sendNotification(order.customerId, {
      title: "Refund Initiated",
      body: `Your refund has been initiated.`,
      type: "payment",
      data: { orderId }
    });
  } catch (postRefundNotificationError) {
    console.error("Refund notification tasks encountered errors:", postRefundNotificationError);
  }
  
  return { message: 'Refund initiated', refundId: refund.id };
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook, initiateRefund, getRazorpay };