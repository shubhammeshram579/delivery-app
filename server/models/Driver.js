// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const Driver = sequelize.define('Driver', {
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true,
//   },
//   userId: {
//     type: DataTypes.UUID,
//     allowNull: false,
//     unique: true,
//     references: { model: 'users', key: 'id' },
//     onDelete: 'CASCADE',
//   },
//   vehicleType: {
//     type: DataTypes.ENUM('bike', 'scooter', 'car', 'van', 'truck'),
//     allowNull: false,
//   },
//   vehicleNumber: {
//     type: DataTypes.STRING(20),
//     allowNull: false,
//     unique: true,
//   },
//   licenseNumber: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     unique: true,
//   },
//   licenseDocument: {
//     type: DataTypes.STRING, // Cloudinary URL
//     defaultValue: null,
//   },
//   vehicleDocument: {
//     type: DataTypes.STRING,
//     defaultValue: null,
//   },
//   isVerified: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false,
//   },
//   isOnline: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false,
//   },
//   isAvailable: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false, // false if on a delivery
//   },
//   currentLat: {
//     type: DataTypes.FLOAT,
//     defaultValue: null,
//   },
//   currentLng: {
//     type: DataTypes.FLOAT,
//     defaultValue: null,
//   },
//   rating: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//     validate: { min: 0, max: 5 },
//   },
//   totalRatings: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0,
//   },
//   totalDeliveries: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0,
//   },
//   totalEarnings: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//   },
// }, {
//   tableName: 'drivers',
//   timestamps: true,
// });

// module.exports = Driver;


// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const Driver = sequelize.define('Driver', {
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true,
//   },
//   userId: {
//     type: DataTypes.UUID,
//     allowNull: false,
//     unique: true,
//   },
//   vehicleType: {
//     type: DataTypes.ENUM('bike', 'scooter', 'car', 'van', 'truck'),
//     allowNull: false,
//   },
//   vehicleNumber: {
//     type: DataTypes.STRING(20),
//     allowNull: false,
//     unique: true,
//   },
//   licenseNumber: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     unique: true,
//   },
//   licenseDocument: { type: DataTypes.STRING, defaultValue: null },
//   vehicleDocument:  { type: DataTypes.STRING, defaultValue: null },
//   isVerified:   { type: DataTypes.BOOLEAN, defaultValue: false },
//   isOnline:     { type: DataTypes.BOOLEAN, defaultValue: false },
//   isAvailable:  { type: DataTypes.BOOLEAN, defaultValue: false },
//   currentLat:   { type: DataTypes.FLOAT, defaultValue: null },
//   currentLng:   { type: DataTypes.FLOAT, defaultValue: null },
//   rating:        { type: DataTypes.FLOAT, defaultValue: 0 },
//   totalRatings:  { type: DataTypes.INTEGER, defaultValue: 0 },
//   totalDeliveries:{ type: DataTypes.INTEGER, defaultValue: 0 },
//   totalEarnings: { type: DataTypes.FLOAT, defaultValue: 0 },
// }, {
//   tableName: 'drivers',
//   timestamps: true,
// });

// module.exports = Driver;


const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  vehicleType: {
    type: DataTypes.ENUM(
      'bike',
      'scooter',
      'car',
      'van',
      'truck'
    ),
    allowNull: false,
  },

  vehicleNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },

  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },

  licenseDocument: {
    type: DataTypes.STRING,
    defaultValue: null,
  },

  vehicleDocument: {
    type: DataTypes.STRING,
    defaultValue: null,
  },

  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  currentLat: {
    type: DataTypes.FLOAT,
    defaultValue: null,
  },

  currentLng: {
    type: DataTypes.FLOAT,
    defaultValue: null,
  },

  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  totalRatings: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  totalDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  totalEarnings: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
}, {
  tableName: 'drivers',
  timestamps: true,
});
 
module.exports = Driver;

