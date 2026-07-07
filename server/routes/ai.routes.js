const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ai.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// AI calls cost money — rate limit to prevent abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 15,               // 15 AI requests per minute per IP
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});

router.use(protect, aiLimiter);

// ── Customer AI features ──────────────────────────────────
router.post('/booking-assistant', restrictTo('customer'), ctrl.bookingAssistant);
router.post('/explain-price',     restrictTo('customer'), ctrl.explainPrice);
router.post('/packaging-advice',  restrictTo('customer'), ctrl.packagingAdvice);

// ── Driver AI features ────────────────────────────────────
router.post('/smart-reply',       restrictTo('driver'), ctrl.smartReply);
router.post('/summarize-notes',   restrictTo('driver'), ctrl.summarizeNotes);

// ── Admin AI features ──────────────────────────────────────
router.post('/admin-query',            restrictTo('admin'), ctrl.adminQuery);
router.get('/fraud-check/:driverId',   restrictTo('admin'), ctrl.detectFraud);

module.exports = router;