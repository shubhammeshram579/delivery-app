'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      role: { type: Sequelize.ENUM('customer', 'driver', 'admin'), defaultValue: 'customer' },
      avatar: { type: Sequelize.STRING },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isEmailVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      isPhoneVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      refreshToken: { type: Sequelize.TEXT },
      lastLoginAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['phone']);
    await queryInterface.addIndex('users', ['role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
