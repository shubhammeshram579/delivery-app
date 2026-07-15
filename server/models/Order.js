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

  
  // Add these fields to Order model (after status field)
paymentMethod: {
  type: DataTypes.ENUM('online', 'cash'),
  defaultValue: 'cash',
},
cashCollected: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},
cashCollectedAt: {
  type: DataTypes.DATE,
  defaultValue: null,
},
pickupOtp: {
  type: DataTypes.STRING(6),
  defaultValue: null,
},
pickupOtpVerified: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},


// Receiver Details
receiverName: {
  type: DataTypes.STRING,
  allowNull: true,
},

receiverPhone: {
  type: DataTypes.STRING,
  allowNull: true,
},

receiverAlternatePhone: {
  type: DataTypes.STRING,
  defaultValue: null,
},

deliveryOtpVerified: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},

packageCategory: {
  type: DataTypes.ENUM(
    "documents",
    "electronics",
    "food",
    "medicine",
    "clothes",
    "furniture",
    "books",
    "jewellery",
    "sports",
    "automobile_parts",
    "passenger",
    "other"
  ),
  allowNull: false,
  defaultValue: "other",
},

packageValue: {
  type: DataTypes.FLOAT,
  defaultValue: 0,
},

isFragile: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},


driverStatus: {
  type: DataTypes.ENUM(
    'assigned',
    'going_to_pickup',
    'arrived_pickup',
    'picked_up',
    'in_transit',
    'arrived_drop',
    'delivered'
  ),
  defaultValue: 'assigned',
},

driverLastLocationAt: {
  type: DataTypes.DATE,
  defaultValue: null,
},

orderType: {
  type: DataTypes.ENUM('passenger', 'delivery'),
  allowNull: false,
  defaultValue: 'delivery', // Defaulting to delivery based on your existing code
},

passengerCount: {
  type: DataTypes.INTEGER,
  defaultValue: null,
},

vehicleType: {
  type: DataTypes.STRING,
  defaultValue: null,
},
// driver cancel 
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
