const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Webhook must be before any auth middleware (raw body)
router.post('/webhook', ctrl.webhook);


router.use(protect);
router.post('/order/:orderId', restrictTo('customer'), ctrl.createOrder);
router.post('/verify', restrictTo('customer'), ctrl.verifyPayment);
router.post('/refund/:orderId', restrictTo('admin'), ctrl.refund);

module.exports = router;
