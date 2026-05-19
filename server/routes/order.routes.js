const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { createOrderValidator, paginationValidator } = require('../middleware/validator.middleware');

router.use(protect);

router.get('/', paginationValidator, ctrl.getOrders);
router.post('/', restrictTo('customer'), createOrderValidator, ctrl.createOrder);
router.get('/:id', ctrl.getOrderById);
router.patch('/:id/accept', restrictTo('driver'), ctrl.acceptOrder);
router.patch('/:id/status', restrictTo('driver'), ctrl.updateStatus);
router.patch('/:id/cancel', restrictTo('customer', 'admin'), ctrl.cancelOrder);
router.post('/:id/rate', restrictTo('customer'), ctrl.rateOrder);

module.exports = router;
