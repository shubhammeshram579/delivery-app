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
//     references: {
//       model: 'users',
//       key: 'id',
//     },
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE',
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

//   // --- DRIVER LICENSE DOCUMENTATION ---
//   licenseNumber: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     unique: true,
//   },
//   licenseUrl: {
//     type: DataTypes.STRING, // URL to S3 Bucket / Cloud Storage
//     allowNull: true,
//   },
//   licenseStatus: {
//     type: DataTypes.ENUM('pending', 'approved', 'rejected'),
//     defaultValue: 'pending',
//   },

//   // --- AADHAAR CARD (NATIONAL ID FOR INDIA) ---
//   aadhaarNumber: {
//     type: DataTypes.STRING(12),
//     allowNull: true,
//     unique: true,
//     validate: {
//       isNumeric: true,
//       len: [12, 12] // Ensures exactly 12 digits
//     }
//   },
//   aadhaarUrl: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   aadhaarStatus: {
//     type: DataTypes.ENUM('pending', 'approved', 'rejected'),
//     defaultValue: 'pending',
//   },

//   // --- VEHICLE REGISTRATION (RC BOOK) ---
//   vehicleDocumentUrl: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   vehicleDocumentStatus: {
//     type: DataTypes.ENUM('pending', 'approved', 'rejected'),
//     defaultValue: 'pending',
//   },

//   // --- REJECTION LOGGING ---
//   // Helps front-end show exactly why an admin rejected their onboarding documents
//   rejectionReason: {
//     type: DataTypes.TEXT,
//     defaultValue: null,
//   },

//   // --- SYSTEM & OPERATIONAL STATES ---
//   isVerified: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false, // Becomes true ONLY when all document statuses are 'approved'
//   },
//   profileCompleted: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false, 
//   },

//   isOnline: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false,
//   },

//   isAvailable: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false,
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

//   driverLastLocationAt: {
//     type: DataTypes.DATE,
//     defaultValue: null,
//   },
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
    type: DataTypes.ENUM('bike', 'scooter', 'car', 'van', 'truck'),
    allowNull: false,
  },

  vehicleNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },

  // --- DRIVER LICENSE DOCUMENTATION ---
  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  licenseUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  licenseExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
    }
  },
  licenseStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },

  // --- AADHAAR CARD (NATIONAL ID FOR INDIA) ---
  aadhaarNumber: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true,
    validate: {
      isNumeric: true,
      len: [12, 12]
    }
  },
  aadhaarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  aadhaarStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },

  // --- VEHICLE REGISTRATION (RC BOOK) ---
  vehicleDocumentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  vehicleRegistrationExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
    }
  },
  vehicleDocumentStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },

  // --- INSURANCE DOCUMENTATION ---
  insuranceExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
    }
  },

  // --- REJECTION LOGGING ---
  rejectionReason: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },

  // --- SYSTEM, OPERATIONAL, & VERIFICATION STATES ---
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users', // Assumes Admin is also stored in users table
      key: 'id',
    },
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profileCompleted: {
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

  driverLastLocationAt: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
}, {
  tableName: 'drivers',
  timestamps: true,
});

module.exports = Driver;