const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('admin'));

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/analytics/revenue', ctrl.getRevenueAnalytics);
router.get('/users', ctrl.getAllUsers);
router.patch('/users/:id/toggle', ctrl.toggleUserStatus);
router.patch('/drivers/:id/verify', ctrl.verifyDriver);
router.get('/orders', ctrl.getAllOrders);

module.exports = router;
