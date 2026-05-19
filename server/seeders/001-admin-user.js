'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const password = await bcrypt.hash('Admin@1234', 12);

    await queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      name: 'Super Admin',
      email: 'admin@deliveryapp.com',
      password,
      phone: '+919000000000',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@deliveryapp.com' });
  },
};
