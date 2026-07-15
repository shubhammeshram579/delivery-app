const router = require('express').Router();
const ctrl = require('../controllers/matching.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);

// ── Driver ─────────────────────────────────────────────────
router.post('/orders/:orderId/offer/accept', restrictTo('driver'), ctrl.acceptOffer);
router.post('/orders/:orderId/offer/reject', restrictTo('driver'), ctrl.rejectOffer);
router.post('/orders/:orderId/driver-cancel', restrictTo('driver'), ctrl.driverCancel);

// ── Admin ────────────────────────────────────────────────────
router.get('/orders/:orderId/candidates',   restrictTo('admin'), ctrl.getCandidates);
router.post('/orders/:orderId/assign',      restrictTo('admin'), ctrl.adminAssign);
router.post('/orders/:orderId/auto-assign', restrictTo('admin'), ctrl.triggerAutoAssign);

module.exports = router;