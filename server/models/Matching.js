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