const svc = require("../services/matching.service");
const asyncHandler = require("../utils/asyncHandler");
const { ValidationError } = require("../middleware/error.middleware");

// ── Driver: accept an offered order ───────────────────────
const acceptOffer = asyncHandler(async (req, res) => {
  const order = await svc.acceptOffer(req.params.orderId, req.user.id);
  res.json({ success: true, data: { order } });
});

// ── Driver: reject an offered order ───────────────────────
const rejectOffer = asyncHandler(async (req, res) => {
  const result = await svc.rejectOffer(req.params.orderId, req.user.id);
  res.json({ success: true, data: result });
});

// ── Driver: cancel an already-accepted order ──────────────
const driverCancel = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) {
    throw new ValidationError("Cancellation reason is required");
  }

  const result = await svc.driverCancelOrder(
    req.params.orderId,
    req.user.id,
    reason
  );
  res.json({ success: true, data: result });
});

// ── Admin: get scored candidate drivers for manual assign ─
const getCandidates = asyncHandler(async (req, res) => {
  const candidates = await svc.getAssignmentCandidates(req.params.orderId);
  res.json({ success: true, data: { candidates } });
});

// ── Admin: manually assign a specific driver ──────────────
const adminAssign = asyncHandler(async (req, res) => {
  const { driverId } = req.body;
  if (!driverId) throw new ValidationError("driverId is required");

  const order = await svc.adminAssignDriver(
    req.params.orderId,
    driverId,
    req.user.id
  );
  res.json({ success: true, data: { order } });
});

// ── Admin: trigger auto-reassignment manually ─────────────
const triggerAutoAssign = asyncHandler(async (req, res) => {
  const result = await svc.assignBestDriver(req.params.orderId, {
    triggeredBy: "admin_manual",
    adminId: req.user.id,
  });
  res.json({ success: true, data: result });
});

module.exports = {
  acceptOffer,
  rejectOffer,
  driverCancel,
  getCandidates,
  adminAssign,
  triggerAutoAssign,
};