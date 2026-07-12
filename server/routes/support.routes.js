const router = require('express').Router();
const ctrl = require('../controllers/support.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// AI support chat costs money to run — rate limit
const supportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many support requests. Please wait a moment.' },
});

router.use(protect);

// ── Customer & Driver ─────────────────────────────────────
router.post('/message',          supportLimiter, restrictTo('customer', 'driver'), ctrl.sendMessage);
router.post('/tickets',          restrictTo('customer', 'driver'), ctrl.createTicket);
router.get('/tickets',           ctrl.getTickets);            // filtered by role inside service
router.get('/tickets/:id',       ctrl.getTicketById);
router.post('/tickets/:id/reply',ctrl.replyToTicket);         // any role can reply on their own ticket

// ── Admin only ─────────────────────────────────────────────
router.patch('/tickets/:id/assign', restrictTo('admin'), ctrl.assignTicket);
router.patch('/tickets/:id',        restrictTo('admin'), ctrl.updateTicket);
router.get('/stats',                restrictTo('admin'), ctrl.getStats);

module.exports = router;