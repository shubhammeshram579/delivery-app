const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console (colorised in dev)
    new winston.transports.Console({
      format: process.env.NODE_ENV !== 'production'
        ? winston.format.combine(winston.format.colorize(), logFormat)
        : logFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/rejections.log') }),
  ],
});

module.exports = logger;
