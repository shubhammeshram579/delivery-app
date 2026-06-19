const express = require("express");

const router = express.Router();

const rateLimit = require("express-rate-limit");

const ctrl = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  registerValidator,
  loginValidator,
  otpValidator,
} = require("../middleware/validator.middleware");

// ─────────────────────────────────────────────
// Rate Limiter
// ─────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  message: {
    success: false,
    message: "Too many requests. Try again later.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

// ─────────────────────────────────────────────
// Auth Routes
// ─────────────────────────────────────────────

router.post("/register", authLimiter, registerValidator, ctrl.register);

// router.post("/login", authLimiter, loginValidator, ctrl.login);
router.post("/login", loginValidator, ctrl.login);

router.post("/verify-email", authLimiter, otpValidator, ctrl.verifyEmail);

router.post("/resend-otp", authLimiter, ctrl.resendOtp);

router.post("/refresh", authLimiter, ctrl.refreshToken);

router.post("/logout", protect, ctrl.logout);

router.post("/forgot-password",    authLimiter, ctrl.forgotPassword);
router.post("/verify-reset-otp",   authLimiter, ctrl.verifyResetOtp);
router.post("/reset-password",     authLimiter, ctrl.resetPassword);
router.post("/resend-reset-otp",   authLimiter, ctrl.resendResetOtp);

router.get("/me", protect, ctrl.getMe);

module.exports = router;
