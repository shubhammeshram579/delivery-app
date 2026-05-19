// const { Sequelize } = require('sequelize');
// const logger = require('../utils/logger');

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: 'postgres',
//   logging: (msg) => {
//     if (process.env.NODE_ENV === 'development') {
//       logger.debug(msg);
//     }
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     acquire: 30000,
//     idle: 10000,
//   },
//   dialectOptions: {
//     ssl: process.env.NODE_ENV === 'production'
//       ? { require: true, rejectUnauthorized: false }
//       : false,
//   },
// });

// const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     logger.info('PostgreSQL connection established');

//     if (process.env.NODE_ENV !== 'production') {
//       // In dev/test run sync — in production use migrations only
//       await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
//       logger.info('Database synced');
//     }
//   } catch (error) {
//     logger.error('Unable to connect to database:', error);
//     throw error;
//   }
// };

// module.exports = { sequelize, connectDB };


const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(msg);
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established');
    // Do NOT call sequelize.sync() — use migrations instead (npm run migrate)
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
