const { SupportTicket, SupportMessage, User } = require("../models");
const { Op } = require("sequelize");
const supportAI = require("./support-ai.service");
const { sendNotification } = require("../utils/notifications");
// Import the new admin notification helper utility
const { notifyAdmins } = require("../utils/adminNotification"); 
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
const sendAIMessage = async ({
  userId,
  userType,
  message,
  conversationHistory = [],
  existingTicketId = null,
}) => {
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

  let result;
  try {
    result = await supportAI.processSupportMessage({
      message,
      userType,
      conversationHistory,
    });
  } catch (aiError) {
    console.error("[Support AI Error] Defaulting to escalation:", aiError.message);
    // Safe fallback if AI service fails in production
    result = {
      resolved: false,
      escalation: {
        category: "general",
        priority: "normal",
        subject: `Support Request from ${userType}`,
        summary: message,
      },
    };
  }

  // If AI successfully resolved the query, return reply
  if (result && result.resolved) {
    return { resolved: true, reply: result.reply, ticketId: null };
  }

  // 🛑 SAFE ESCALATION PARSING: Guarantee fallback data if AI escalation object is missing
  const escalationData = result?.escalation || {};
  const category = escalationData.category || "general";
  const priority = escalationData.priority || "high";
  const subject = escalationData.subject || message.slice(0, 100);
  const aiSummary = escalationData.summary || message;

  // AI couldn't resolve — create a ticket + notify admin
  const ticket = await createTicket({
    userId,
    userType,
    category,
    priority,
    subject,
    aiSummary,
    sentimentFlag: result?.sentiment || "neutral",
    source: "ai_escalated",
  });

  // Save history messages
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

  const escalationReply =
    "This issue requires assistance from our support team. I've created a support ticket and notified an administrator. Someone will be with you shortly.";

  await SupportMessage.create({
    ticketId: ticket.id,
    senderType: "ai",
    senderId: null,
    message: escalationReply,
    messageType: "system",
  });

  return {
    resolved: false,
    reply: escalationReply,
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

  // 3. Asynchronously handle heavy push notifications using the utility helper
  setImmediate(async () => {
    try {
      const priorityEmoji = {
        critical: "🔴",
        high: "🟠",
        normal: "🟡",
        low: "🟢",
      };
      const notificationTitle = `${priorityEmoji[priority] || "🟡"} New ${priority} ticket — ${userType}`;

      // Clean abstraction: Using notifyAdmins utility helper here
      await notifyAdmins({
        title: notificationTitle,
        body: subject,
        type: "support",
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          priority,
        },
      });

    } catch (notificationBlockError) {
      console.error(
        "[Service Error] Support alert system failed:",
        notificationBlockError.message,
      );
    }
  });

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


const addMessageToTicket = async (ticketId, senderId, senderType, message) => {

  // console.log("tiketes",ticketId, senderId, senderType, message)
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new NotFoundError("Ticket");

  const msg = await SupportMessage.create({
    ticketId,
    senderId,
    senderType,
    message,
  });

  if (senderType !== "admin" && ticket.status === "waiting_on_user") {
    await ticket.update({ status: "in_progress" });
  }

  const io = getIo();

  // 1. Emit Socket.io real-time event to ticket room & user room
  if (io) {
    io.to(`ticket:${ticketId}`).emit("support:new-message", msg);
    if (senderType === "admin") {
      io.to(`user:${ticket.userId}`).emit("support:notification", {
        type: "support",
        title: "Support team replied",
        body: message.slice(0, 100),
        ticketId: ticket.id,
      });
    }
  }

  // 2. Push Notification
  if (senderType === "admin") {
    await ticket.update({ status: "waiting_on_user" });

    try {
      // NOTE: Verify whether sendNotification expects (userId, payload) or ({ userId, ... })
      await sendNotification(ticket.userId, {
        userType: ticket.userType,
        title: "Support team replied",
        body: message.slice(0, 100),
        type: "support",
        data: { 
          ticketId: String(ticket.id),
          ticketNumber: String(ticket.ticketNumber || "")
        },
      });
    } catch (notifErr) {
      console.error(`[Support Notification Error] Failed to notify user (${ticket.userId}):`, notifErr.message);
    }
  } else {
    if (ticket.assignedAdminId) {
      try {
        await sendNotification(ticket.assignedAdminId, {
          userType: "admin",
          title: `New message — Ticket #${ticket.ticketNumber}`,
          body: message.slice(0, 100),
          type: "support",
          data: { 
            ticketId: String(ticket.id),
            ticketNumber: String(ticket.ticketNumber || "")
          },
        });
      } catch (notifErr) {
        console.error(`[Support Notification Error] Failed to notify admin (${ticket.assignedAdminId}):`, notifErr.message);
      }
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
