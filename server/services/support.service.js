/**
 * support.service.js
 * Ticket + message CRUD, AI-first message handling, admin operations
 */

const { SupportTicket, SupportMessage, User } = require("../models");
const { Op } = require("sequelize");
const supportAI = require("./support-ai.service");
const { sendNotification } = require("../utils/notifications");
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require("../middleware/error.middleware");
const { getIo } = require("../sockets");
// ─────────────────────────────────────────────────────────
// Send a message in the "AI assistant" pre-ticket phase
// (No ticket exists yet — this is the floating chat widget flow)
// ─────────────────────────────────────────────────────────

// Ensure this block handles the text reply when the AI resolves the request cleanly without escalating:
const sendAIMessage = async ({
  userId,
  userType,
  message,
  conversationHistory = [],
  existingTicketId = null,
}) => {
  console.log(userId, userType, message, conversationHistory);
  if (existingTicketId) {
    const ticket = await SupportTicket.findByPk(existingTicketId);
    if (
      ticket &&
      ["open", "in_progress", "waiting_on_user"].includes(ticket.status)
    ) {
      const msg = await addMessageToTicket(
        existingTicketId,
        userId,
        userType,
        message,
      );
      return {
        ticketId: ticket.id,
        ticketStatus: ticket.status,
        message: msg,
        aiHandled: false,
      };
    }
  }

  const result = await supportAI.processSupportMessage({
    message,
    userType,
    conversationHistory,
  });

  // console.log("result",result)

  // When AI replies directly (asking for order number or giving an FAQ answer)
  if (result.resolved) {
    return { resolved: true, reply: result.reply, ticketId: null };
  }

  //  console.log("result after",result)

  // AI couldn't resolve — create a ticket + notify admin
  const ticket = await createTicket({
    userId,
    userType,
    category: result.escalation.category,
    priority: result.escalation.priority,
    subject: result.escalation.subject,
    aiSummary: result.escalation.summary,
    sentimentFlag: result.sentiment,
    source: "ai_escalated",
  });

  // Log the conversation history path
  for (const h of conversationHistory) {
    await SupportMessage.create({
      ticketId: ticket.id,
      senderType: h.senderType,
      senderId: h.senderType === "ai" ? null : userId,
      message: h.message,
    });
  }
  await SupportMessage.create({
    ticketId: ticket.id,
    senderType: userType,
    senderId: userId,
    message,
  });
  await SupportMessage.create({
    ticketId: ticket.id,
    senderType: "ai",
    senderId: null,
    message:
      "This issue requires assistance from our support team. I've created a support ticket and notified an administrator. Someone will be with you shortly.",
    messageType: "system",
  });

  return {
    resolved: false,
    reply:
      "This issue requires assistance from our support team. I've created a support ticket and notified an administrator. Someone will be with you shortly.",
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
  };
};

// ─────────────────────────────────────────────────────────
// Create ticket + notify admins
// ─────────────────────────────────────────────────────────

const createTicket = async ({
  userId,
  userType,
  category,
  priority,
  subject,
  aiSummary = null,
  source = "user_initiated",
  orderId = null,
}) => {
  // 1. Persist ticket to Database
  const ticket = await SupportTicket.create({
    userId,
    userType,
    category,
    priority,
    subject,
    aiSummary,
    source,
    orderId,
    status: "open",
  });

  // 2. Real-time broadcast to connected admin dashboard sockets
  const io = getIo();
  if (io) {
    io.to("support:admins").emit("support:new-ticket", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      priority: ticket.priority,
      category: ticket.category,
      subject: ticket.subject,
      userType: ticket.userType,
      createdAt: ticket.createdAt,
    });
  }

  // 3. Asynchronously handle heavy push notifications so the client request isn't blocked
  setImmediate(async () => {
    try {
      const admins = await User.findAll({
        where: { role: "admin" },
        attributes: ["id"],
      });

      const priorityEmoji = {
        critical: "🔴",
        high: "🟠",
        normal: "🟡",
        low: "🟢",
      };
      const notificationTitle = `${priorityEmoji[priority] || "🟡"} New ${priority} ticket — ${userType}`;

      // Run all push notifications concurrently rather than sequentially
      const notificationPromises = admins.map((admin) =>
        sendNotification(admin.id, {
          title: notificationTitle,
          body: subject,
          type: "support", // Adjusted from 'chat' to accurately represent the context
          data: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            priority,
          },
        }).catch((err) =>
          console.error(
            `[Notification Error] Failed for admin ${admin.id}:`,
            err.message,
          ),
        ),
      );

      await Promise.all(notificationPromises);
    } catch (notificationBlockError) {
      console.error(
        "[Service Error] Support alert system failed:",
        notificationBlockError.message,
      );
    }
  });

  // Return the instance back immediately
  return ticket;
};

// ─────────────────────────────────────────────────────────
// Create ticket directly (user clicks "Contact Support" — skips AI)
// ─────────────────────────────────────────────────────────
const createManualTicket = async ({
  userId,
  userType,
  category,
  subject,
  message,
  orderId = null,
}) => {
  const ticket = await createTicket({
    userId,
    userType,
    category,
    priority: "normal",
    subject,
    source: "user_initiated",
    orderId,
  });

  await SupportMessage.create({
    ticketId: ticket.id,
    senderType: userType,
    senderId: userId,
    message,
  });

  return ticket;
};

// ─────────────────────────────────────────────────────────
// Add a message to an existing ticket (chat continues)
// ─────────────────────────────────────────────────────────
const addMessageToTicket = async (ticketId, senderId, senderType, message) => {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new NotFoundError("Ticket");

  const msg = await SupportMessage.create({
    ticketId,
    senderId,
    senderType,
    message,
  });

  // If customer/driver replies to a ticket that was "waiting_on_user" → back to in_progress
  if (senderType !== "admin" && ticket.status === "waiting_on_user") {
    await ticket.update({ status: "in_progress" });
  }

  // If admin replies → mark waiting_on_user (waiting for customer response)
  if (senderType === "admin") {
    await ticket.update({ status: "waiting_on_user" });
    // Notify the ticket owner
    await sendNotification(ticket.userId, {
      title: "Support team replied",
      body: message.slice(0, 100),
      type: "support",
      data: { ticketId: ticket.id },
    });
  } else {
    // Notify assigned admin (if any) of new customer message
    if (ticket.assignedAdminId) {
      await sendNotification(ticket.assignedAdminId, {
        title: `New message — Ticket #${ticket.ticketNumber}`,
        body: message.slice(0, 100),
        type: "support",
        data: { ticketId: ticket.id },
      });
    }
  }

  return msg;
};

// ─────────────────────────────────────────────────────────
// Get tickets — for customer/driver (their own) or admin (all)
// ─────────────────────────────────────────────────────────
const getTickets = async ({
  userId,
  role,
  page = 1,
  limit = 20,
  status,
  priority,
  category,
}) => {
  page = parseInt(page);
  limit = parseInt(limit);
  const where = {};

  if (role !== "admin") where.userId = userId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;

  const { count, rows } = await SupportTicket.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "phone", "avatar"],
      },
      {
        model: User,
        as: "assignedAdmin",
        attributes: ["id", "name"],
        required: false,
      },
    ],
    order: [
      // Critical/high priority tickets bubble to top for admin view
      ...(role === "admin"
        ? [
            [
              SupportTicket.sequelize.literal(
                `CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
              ),
              "ASC",
            ],
          ]
        : []),
      ["createdAt", "DESC"],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    tickets: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

const getTicketById = async (ticketId, { userId, role }) => {
  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "phone", "avatar"],
      },
      {
        model: User,
        as: "assignedAdmin",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: SupportMessage,
        as: "messages",
        separate: true,
        order: [["createdAt", "ASC"]],
      },
    ],
  });
  if (!ticket) throw new NotFoundError("Ticket");
  if (role !== "admin" && String(ticket.userId) !== String(userId)) {
    throw new AuthorizationError("Not your ticket");
  }
  return ticket;
};

// ─────────────────────────────────────────────────────────
// Admin: assign ticket to self / another admin
// ─────────────────────────────────────────────────────────
const assignTicket = async (ticketId, adminId) => {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new NotFoundError("Ticket");
  await ticket.update({ assignedAdminId: adminId, status: "in_progress" });
  return ticket;
};

// ─────────────────────────────────────────────────────────
// Admin: update priority/category/status
// ─────────────────────────────────────────────────────────
const updateTicket = async (ticketId, updates) => {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new NotFoundError("Ticket");

  const allowed = ["priority", "category", "status"];
  const data = {};
  for (const key of allowed)
    if (updates[key] !== undefined) data[key] = updates[key];

  if (data.status === "resolved") data.resolvedAt = new Date();
  if (data.status === "closed") data.closedAt = new Date();

  await ticket.update(data);
  return ticket;
};

// ─────────────────────────────────────────────────────────
// Admin dashboard: ticket stats
// ─────────────────────────────────────────────────────────
const getTicketStats = async () => {
  const [open, inProgress, waiting, resolved, critical, high] =
    await Promise.all([
      SupportTicket.count({ where: { status: "open" } }),
      SupportTicket.count({ where: { status: "in_progress" } }),
      SupportTicket.count({ where: { status: "waiting_on_user" } }),
      SupportTicket.count({
        where: {
          status: "resolved",
          resolvedAt: { [Op.gte]: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      SupportTicket.count({
        where: {
          priority: "critical",
          status: { [Op.notIn]: ["resolved", "closed"] },
        },
      }),
      SupportTicket.count({
        where: {
          priority: "high",
          status: { [Op.notIn]: ["resolved", "closed"] },
        },
      }),
    ]);
  return {
    open,
    inProgress,
    waiting,
    resolvedThisWeek: resolved,
    critical,
    high,
    totalActive: open + inProgress + waiting,
  };
};

module.exports = {
  sendAIMessage,
  createTicket,
  createManualTicket,
  addMessageToTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicket,
  getTicketStats,
};
