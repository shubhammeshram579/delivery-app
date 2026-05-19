// require('dotenv').config({ path: '../.env' });
require('dotenv').config(); // no path needed - runs from server/ folder

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
