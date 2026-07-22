const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  createOrderValidator,
  paginationValidator,
} = require("../middleware/validator.middleware");
const { uploadDeliveryProof } = require("../middleware/upload.middleware");

router.use(protect);

router.get("/", paginationValidator, ctrl.getOrders);
router.post(
  "/",
  restrictTo("customer"),
  createOrderValidator,
  ctrl.createOrder,
);
router.get("/:id", ctrl.getOrderById);
router.patch("/:id/accept", restrictTo("driver"), ctrl.acceptOrder);
router.patch("/:id/status", restrictTo("driver"), ctrl.updateStatus);
router.patch("/:id/cancel", restrictTo("customer", "admin"), ctrl.cancelOrder);
router.post("/:id/rate", restrictTo("customer"), ctrl.rateOrder);

// ── New endpoints ──────────────────────────────────────────
// Driver uploads delivery proof photo then marks delivered
router.post(
  "/:id/delivery-proof",
  restrictTo("driver"),
  uploadDeliveryProof.single("photo"),
  ctrl.uploadDeliveryProof,
);

// Driver marks cash collected from customer
router.patch(
  "/:id/cash-collected",
  restrictTo("driver"),
  ctrl.markCashCollected,
);

// Generate OTP for pickup verification (sent to customer)
router.post("/:id/pickup-otp", restrictTo("driver"), ctrl.generatePickupOtp);

// Customer verifies pickup OTP
router.post(
  "/:id/verify-pickup-otp",
  restrictTo("driver"),
  ctrl.verifyPickupOtp,
);

router.post(
  "/:id/delivery-otp",
  restrictTo("driver"),
  ctrl.generateDeliveryOtp,
);

// Customer verifies pickup OTP
router.post(
  "/:id/verify-delivery-otp",
  restrictTo("driver"),
  ctrl.verifyDeliveryOtp,
);

router.get("/:id/live-location", ctrl.getOrderLiveLocation);
module.exports = router;
