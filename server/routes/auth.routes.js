// const express = require("express");

// const router = express.Router();

// const rateLimit = require("express-rate-limit");

// const ctrl = require("../controllers/auth.controller");

// const { protect } = require("../middleware/auth.middleware");

// const {
//   registerValidator,
//   loginValidator,
//   otpValidator,
// } = require("../middleware/validator.middleware");

// // ─────────────────────────────────────────────
// // Rate Limiter
// // ─────────────────────────────────────────────

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,

//   max: 10,

//   message: {
//     success: false,
//     message: "Too many requests. Try again later.",
//   },

//   standardHeaders: true,

//   legacyHeaders: false,
// });

// // ─────────────────────────────────────────────
// // Auth Routes
// // ─────────────────────────────────────────────
// router.post("/registerAdmin", authLimiter, registerValidator, ctrl.registerAdmin);

// router.post("/register", authLimiter, registerValidator, ctrl.register);

// // router.post("/login", authLimiter, loginValidator, ctrl.login);
// router.post("/login", loginValidator, ctrl.login);

// router.post("/verify-email", authLimiter, otpValidator, ctrl.verifyEmail);

// router.post("/resend-otp", authLimiter, ctrl.resendOtp);

// router.post("/refresh", authLimiter, ctrl.refreshToken);

// router.post("/logout", protect, ctrl.logout);

// router.post("/forgot-password",    authLimiter, ctrl.forgotPassword);
// router.post("/verify-reset-otp",   authLimiter, ctrl.verifyResetOtp);
// router.post("/reset-password",     authLimiter, ctrl.resetPassword);
// router.post("/resend-reset-otp",   authLimiter, ctrl.resendResetOtp);

// router.get("/me", protect, ctrl.getMe);

// module.exports = router;



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
// Rate Limiters Configuration
// ─────────────────────────────────────────────

// 1. Strict Limiter: For high-abuse sensitive actions (OTP, Registration, Password Reset)
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by target email if present, otherwise IP address
    const target = req.body?.email ? req.body.email.toLowerCase().trim() : "";
    return `${req.ip}_${target}`;
  },
});

// 2. Login Limiter: Prevents brute force while allowing reasonable attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Token Refresh Limiter: High capacity for background polling/refreshing
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Allows up to 200 refresh requests per 15 mins
  message: {
    success: false,
    message: "Too many refresh attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─────────────────────────────────────────────
// Auth Routes
// ─────────────────────────────────────────────

// Registration & Login
router.post("/registerAdmin", strictAuthLimiter, registerValidator, ctrl.registerAdmin);
router.post("/register", strictAuthLimiter, registerValidator, ctrl.register);
router.post("/login", loginLimiter, loginValidator, ctrl.login);

// Email Verification & OTP
router.post("/verify-email", strictAuthLimiter, otpValidator, ctrl.verifyEmail);
router.post("/resend-otp", strictAuthLimiter, ctrl.resendOtp);

// Session Management (High capacity to prevent 429 drops)
router.post("/refresh", refreshLimiter, ctrl.refreshToken);
router.post("/logout", protect, ctrl.logout);

// Password Recovery
router.post("/forgot-password", strictAuthLimiter, ctrl.forgotPassword);
router.post("/verify-reset-otp", strictAuthLimiter, ctrl.verifyResetOtp);
router.post("/reset-password", strictAuthLimiter, ctrl.resetPassword);
router.post("/resend-reset-otp", strictAuthLimiter, ctrl.resendResetOtp);

// Authenticated User Profile
router.get("/me", protect, ctrl.getMe);

module.exports = router;