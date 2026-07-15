/**
 * MODEL ADDITIONS for driver reassignment / matching engine
 *
 * PART A — Add these fields to your existing Driver model in models/index.js
 * PART B — Add these fields to your existing Order model in models/index.js
 * PART C — New AssignmentHistory model (add as a new sequelize.define block)
 * PART D — Associations to add
 */

// ─────────────────────────────────────────────────────────
// PART A — Add to Driver model's field definitions:
// ─────────────────────────────────────────────────────────
/*
  acceptanceRate: {
    type: DataTypes.FLOAT,
    defaultValue: 100, // starts optimistic — new drivers aren't penalized
  },
  totalAssignmentsOffered: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalAssignmentsAccepted:{ type: DataTypes.INTEGER, defaultValue: 0 },
  totalAssignmentsRejected:{ type: DataTypes.INTEGER, defaultValue: 0 },
  currentActiveOrders:     { type: DataTypes.INTEGER, defaultValue: 0 }, // workload tracking
*/

// ─────────────────────────────────────────────────────────
// PART B — Add to Order model's field definitions:
// ─────────────────────────────────────────────────────────
/*
  // Track which drivers already rejected/timed-out for this order —
  // critical so retry logic never re-offers to the same driver
  rejectedDriverIds: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // How many times we've attempted to (re)assign this order
  assignmentAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Was this order EVER cancelled by a driver (for admin visibility)
  wasDriverCancelled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  driverCancelReason: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  // Currently pending assignment — driver has X seconds to respond
  pendingDriverId: {
    type: DataTypes.UUID,
    defaultValue: null,
  },
  pendingAssignmentExpiresAt: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
*/

// ─────────────────────────────────────────────────────────
// PART C — New model: AssignmentHistory
// Add this as a new sequelize.define() block in models/index.js
// ─────────────────────────────────────────────────────────

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignmentHistory = sequelize.define('AssignmentHistory', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:  { type: DataTypes.UUID, allowNull: false },
  driverId: { type: DataTypes.UUID, allowNull: false }, // Driver.id (not userId)

  // How this assignment attempt was created
  triggeredBy: {
    type: DataTypes.ENUM('system_auto', 'admin_manual', 'initial_accept'),
    defaultValue: 'system_auto',
  },

  score: { type: DataTypes.FLOAT, defaultValue: null }, // matching score at time of offer
  scoreBreakdown: { type: DataTypes.JSONB, defaultValue: null }, // { distance, rating, acceptanceRate, workload }

  status: {
    type: DataTypes.ENUM('offered', 'accepted', 'rejected', 'timed_out', 'cancelled_by_driver'),
    defaultValue: 'offered',
  },

  offeredAt:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  respondedAt: { type: DataTypes.DATE, defaultValue: null },

  // If this record represents a driver cancelling an already-accepted order
  cancelReason: { type: DataTypes.TEXT, defaultValue: null },

  adminId: { type: DataTypes.UUID, defaultValue: null }, // set when triggeredBy = admin_manual
}, {
  tableName: 'assignment_history',
  timestamps: true,
});

module.exports  =  AssignmentHistory;

// ─────────────────────────────────────────────────────────
// PART D — Associations to add in models/index.js
// ─────────────────────────────────────────────────────────
/*
  Order.hasMany(AssignmentHistory, { foreignKey: 'orderId', as: 'assignmentHistory', constraints: false });
  AssignmentHistory.belongsTo(Order, { foreignKey: 'orderId', constraints: false });

  Driver.hasMany(AssignmentHistory, { foreignKey: 'driverId', as: 'assignmentAttempts', constraints: false });
  AssignmentHistory.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver', constraints: false });

  Then add AssignmentHistory to your final module.exports.
*/