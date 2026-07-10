const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  amount:   { type: DataTypes.FLOAT, allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded','pending_cash_collection'),
    defaultValue: 'pending',
  },
  method: {
    type: DataTypes.ENUM('razorpay', 'cod', 'wallet'),
    defaultValue: 'razorpay',
  },
  razorpayOrderId:   { type: DataTypes.STRING, defaultValue: null },
  razorpayPaymentId: { type: DataTypes.STRING, defaultValue: null },
  razorpaySignature: { type: DataTypes.STRING, defaultValue: null },
  paidAt:     { type: DataTypes.DATE, defaultValue: null },
  refundedAt: { type: DataTypes.DATE, defaultValue: null },
  refundId:   { type: DataTypes.STRING, defaultValue: null },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;
