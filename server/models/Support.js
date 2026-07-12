/**
 * SUPPORT MODELS — add this block into your existing server/models/index.js
 * Place it alongside your other sequelize.define() calls, then add the
 * associations at the bottom (shown at the end of this file).
 */

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ── SUPPORT TICKET ────────────────────────────────────────
const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketNumber: { type: DataTypes.STRING, unique: true },

    userType: { type: DataTypes.ENUM("customer", "driver"), allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false }, // customer or driver's User.id

    orderId: { type: DataTypes.UUID, defaultValue: null }, // optional — link to related order

    category: {
      type: DataTypes.ENUM(
        "delivery",
        "payment",
        "refund",
        "account",
        "technical",
        "order",
        "driver",
        "other",
      ),
      defaultValue: "other",
    },

    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "critical"),
      defaultValue: "normal",
    },

    status: {
      type: DataTypes.ENUM(
        "open",
        "in_progress",
        "waiting_on_user",
        "resolved",
        "closed",
      ),
      defaultValue: "open",
    },

    subject: { type: DataTypes.STRING(200), allowNull: false },

    // Where did this ticket come from
    source: {
      type: DataTypes.ENUM("ai_escalated", "user_initiated"),
      defaultValue: "user_initiated",
    },

    // Cheap keyword-based urgency flag (no extra AI call)
    sentimentFlag: {
      type: DataTypes.ENUM("neutral", "frustrated", "urgent"),
      defaultValue: "neutral",
    },

    assignedAdminId: { type: DataTypes.UUID, defaultValue: null },

    resolvedAt: { type: DataTypes.DATE, defaultValue: null },
    closedAt: { type: DataTypes.DATE, defaultValue: null },

    // What the AI tried before escalating — helps admin get context fast
    aiSummary: { type: DataTypes.TEXT, defaultValue: null },
  },
  {
    tableName: "support_tickets",
    timestamps: true,
    hooks: {
      beforeCreate: (ticket) => {
        ticket.ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      },
    },
  },
);

// ── SUPPORT MESSAGE ────────────────────────────────────────
const SupportMessage = sequelize.define(
  "SupportMessage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketId: { type: DataTypes.UUID, allowNull: false },

    senderType: {
      type: DataTypes.ENUM("customer", "driver", "admin", "ai"),
      allowNull: false,
    },
    senderId: { type: DataTypes.UUID, defaultValue: null }, // null when senderType === 'ai'

    message: { type: DataTypes.TEXT, allowNull: false },
    messageType: {
      type: DataTypes.ENUM("text", "system"),
      defaultValue: "text",
    },

    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "support_messages",
    timestamps: true,
  },
);

module.exports = { SupportTicket, SupportMessage };


