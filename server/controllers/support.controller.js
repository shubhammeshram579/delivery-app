const svc = require("../services/support.service");
const asyncHandler = require("../utils/asyncHandler");
const { ValidationError } = require("../middleware/error.middleware");

// ── Customer/Driver: chat with AI assistant ───────────────
const sendMessage = asyncHandler(async (req, res) => {
  const { message, conversationHistory, ticketId } = req.body;

  if (!message?.trim()) throw new ValidationError("Message is required");

  const result = await svc.sendAIMessage({
    userId: req.user.id,
    userType: req.user.role, // 'customer' or 'driver'
    message,
    conversationHistory: conversationHistory || [],
    existingTicketId: ticketId || null,
  });

  res.json({ success: true, data: result });
});

// ── Customer/Driver: create ticket directly (skip AI) ─────
const createTicket = asyncHandler(async (req, res) => {
  const { category, subject, message, orderId } = req.body;

  if (!subject?.trim() || !message?.trim()) {
    throw new ValidationError("Subject and message are required");
  }

  const ticket = await svc.createManualTicket({
    userId: req.user.id,
    userType: req.user.role,
    category: category || "other",
    subject,
    message,
    orderId,
  });

  res.status(201).json({ success: true, data: { ticket } });
});

// ── Reply to existing ticket (any role) ───────────────────
const replyToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) throw new ValidationError("Message is required");

  const senderType = req.user.role === "admin" ? "admin" : req.user.role;

  const msg = await svc.addMessageToTicket(
    req.params.id,
    req.user.id,
    senderType,
    message
  );

  res.status(201).json({ success: true, data: { message: msg } });
});

// ── Get tickets (own for user, all for admin) ─────────────
const getTickets = asyncHandler(async (req, res) => {
  const data = await svc.getTickets({
    userId: req.user.id,
    role: req.user.role,
    ...req.query,
  });

  res.json({ success: true, data });
});

// ── Get single ticket with full message history ──────────
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await svc.getTicketById(req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });

  res.json({ success: true, data: { ticket } });
});

// ── Admin: assign ticket to self ──────────────────────────
const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await svc.assignTicket(req.params.id, req.user.id);

  res.json({ success: true, data: { ticket } });
});

// ── Admin: update ticket (status/priority/category) ──────
const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await svc.updateTicket(req.params.id, req.body);

  res.json({ success: true, data: { ticket } });
});

// ── Admin: dashboard stats ────────────────────────────────
const getStats = asyncHandler(async (req, res) => {
  const stats = await svc.getTicketStats();

  res.json({ success: true, data: stats });
});

module.exports = {
  sendMessage,
  createTicket,
  replyToTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicket,
  getStats,
};
