const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM('customer', 'driver', 'admin'),
    defaultValue: 'customer',
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  refreshToken: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
  defaultScope: {
    attributes: { exclude: ['password', 'refreshToken'] },
  },
  scopes: {
    withPassword: { attributes: {} }, // includes all
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
