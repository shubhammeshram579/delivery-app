// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const Order = sequelize.define('Order', {
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true,
//   },
//   orderNumber: {
//     type: DataTypes.STRING,
//     unique: true,
//   },
//   customerId: {
//     type: DataTypes.UUID,
//     allowNull: false,
//     references: { model: 'users', key: 'id' },
//   },
//   driverId: {
//     type: DataTypes.UUID,
//     defaultValue: null,
//     references: { model: 'drivers', key: 'id' },
//   },

//   // Pickup details
//   pickupAddress: { type: DataTypes.TEXT, allowNull: false },
//   pickupLat: { type: DataTypes.FLOAT, allowNull: false },
//   pickupLng: { type: DataTypes.FLOAT, allowNull: false },

//   // Drop details
//   dropAddress: { type: DataTypes.TEXT, allowNull: false },
//   dropLat: { type: DataTypes.FLOAT, allowNull: false },
//   dropLng: { type: DataTypes.FLOAT, allowNull: false },

//   // Package info
//   packageWeight: { type: DataTypes.FLOAT, allowNull: false },
//   packageDescription: { type: DataTypes.TEXT, defaultValue: null },
//   deliveryInstructions: { type: DataTypes.TEXT, defaultValue: null },

//   // Status lifecycle
//   status: {
//     type: DataTypes.ENUM(
//       'pending',      // order placed, awaiting driver
//       'accepted',     // driver accepted
//       'picked_up',    // driver picked package
//       'in_transit',   // on the way
//       'delivered',    // successfully delivered
//       'cancelled',    // cancelled by customer/admin
//       'failed'        // delivery failed
//     ),
//     defaultValue: 'pending',
//   },

//   // Pricing
//   distance: { type: DataTypes.FLOAT, defaultValue: null },       // km
//   estimatedTime: { type: DataTypes.INTEGER, defaultValue: null }, // minutes
//   basePrice: { type: DataTypes.FLOAT, allowNull: false },
//   deliveryFee: { type: DataTypes.FLOAT, allowNull: false },
//   totalAmount: { type: DataTypes.FLOAT, allowNull: false },

//   // Proof of delivery
//   deliveryProofImage: { type: DataTypes.STRING, defaultValue: null },
//   deliverySignature: { type: DataTypes.STRING, defaultValue: null },

//   // Timestamps for each status
//   acceptedAt: { type: DataTypes.DATE, defaultValue: null },
//   pickedUpAt: { type: DataTypes.DATE, defaultValue: null },
//   deliveredAt: { type: DataTypes.DATE, defaultValue: null },
//   cancelledAt: { type: DataTypes.DATE, defaultValue: null },

//   cancelReason: { type: DataTypes.TEXT, defaultValue: null },

//   // Rating
//   customerRating: { type: DataTypes.FLOAT, defaultValue: null },
//   customerReview: { type: DataTypes.TEXT, defaultValue: null },
// }, {
//   tableName: 'orders',
//   timestamps: true,
//   hooks: {
//     beforeCreate: (order) => {
//       // Generate human-readable order number
//       order.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
//     },
//   },
// });

// module.exports = Order;


const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  driverId: {
    type: DataTypes.UUID,
    defaultValue: null,
  },

  // Pickup
  pickupAddress: { type: DataTypes.TEXT, allowNull: false },
  pickupLat:     { type: DataTypes.FLOAT, allowNull: false },
  pickupLng:     { type: DataTypes.FLOAT, allowNull: false },

  // Drop
  dropAddress: { type: DataTypes.TEXT, allowNull: false },
  dropLat:     { type: DataTypes.FLOAT, allowNull: false },
  dropLng:     { type: DataTypes.FLOAT, allowNull: false },

  // Package
  packageWeight:       { type: DataTypes.FLOAT, allowNull: false },
  packageDescription:  { type: DataTypes.TEXT, defaultValue: null },
  deliveryInstructions:{ type: DataTypes.TEXT, defaultValue: null },

  // Status
  status: {
    type: DataTypes.ENUM(
      'pending', 'accepted', 'picked_up',
      'in_transit', 'delivered', 'cancelled', 'failed'
    ),
    defaultValue: 'pending',
  },

  // Pricing
  distance:      { type: DataTypes.FLOAT, defaultValue: null },
  estimatedTime: { type: DataTypes.INTEGER, defaultValue: null },
  basePrice:     { type: DataTypes.FLOAT, allowNull: false },
  deliveryFee:   { type: DataTypes.FLOAT, allowNull: false },
  totalAmount:   { type: DataTypes.FLOAT, allowNull: false },

  // Proof
  deliveryProofImage: { type: DataTypes.STRING, defaultValue: null },
  deliverySignature:  { type: DataTypes.STRING, defaultValue: null },

  // Timestamps per status
  acceptedAt:  { type: DataTypes.DATE, defaultValue: null },
  pickedUpAt:  { type: DataTypes.DATE, defaultValue: null },
  deliveredAt: { type: DataTypes.DATE, defaultValue: null },
  cancelledAt: { type: DataTypes.DATE, defaultValue: null },
  cancelReason:{ type: DataTypes.TEXT, defaultValue: null },

  // Rating
  customerRating: { type: DataTypes.FLOAT, defaultValue: null },
  customerReview: { type: DataTypes.TEXT, defaultValue: null },
}, {
  tableName: 'orders',
  timestamps: true,
  hooks: {
    beforeCreate: (order) => {
      order.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    },
  },
});

module.exports = Order;
