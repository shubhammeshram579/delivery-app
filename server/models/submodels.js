const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Location
const Location = sequelize.define('Location', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:  { type: DataTypes.UUID, allowNull: false },
  driverId: { type: DataTypes.UUID, allowNull: false },
  lat:      { type: DataTypes.FLOAT, allowNull: false },
  lng:      { type: DataTypes.FLOAT, allowNull: false },
  speed:    { type: DataTypes.FLOAT, defaultValue: null },
  heading:  { type: DataTypes.FLOAT, defaultValue: null },
}, { tableName: 'locations', timestamps: true });

// Earnings
const Earnings = sequelize.define('Earnings', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  driverId:    { type: DataTypes.UUID, allowNull: false },
  orderId:     { type: DataTypes.UUID, allowNull: false, unique: true },
  amount:      { type: DataTypes.FLOAT, allowNull: false },
  platformFee: { type: DataTypes.FLOAT, allowNull: false },
  netEarning:  { type: DataTypes.FLOAT, allowNull: false },
  isPaid:      { type: DataTypes.BOOLEAN, defaultValue: false },
  paidAt:      { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'earnings', timestamps: true });

// Notification
const Notification = sequelize.define('Notification', {
  id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title:  { type: DataTypes.STRING, allowNull: false },
  body:   { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('order', 'payment', 'system', 'chat'),
    defaultValue: 'system',
  },
  data:   { type: DataTypes.JSONB, defaultValue: {} },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'notifications', timestamps: true });

// ChatMessage
const ChatMessage = sequelize.define('ChatMessage', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:    { type: DataTypes.UUID, allowNull: false },
  senderId:   { type: DataTypes.UUID, allowNull: false },
  senderRole: { type: DataTypes.ENUM('customer', 'driver'), allowNull: false },
  message:    { type: DataTypes.TEXT, allowNull: false },
  isRead:     { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'chat_messages', timestamps: true });

module.exports = { Location, Earnings, Notification, ChatMessage };
