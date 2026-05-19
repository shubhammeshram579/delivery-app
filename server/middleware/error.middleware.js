// ── Custom Error Classes ──────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = "You do not have permission") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

// ── Error Handler Middleware ──────────────────────────────

const logger = require("../utils/logger");

const handleSequelizeValidation = (err) =>
  new ValidationError(err.errors.map((e) => e.message).join(", "));

const handleSequelizeUnique = (err) => {
  const field = err.errors[0]?.path || "field";
  return new ConflictError(`${field} already exists`);
};

const handleJWTError = () =>
  new AuthenticationError("Invalid token. Please log in again.");
const handleJWTExpired = () =>
  new AuthenticationError("Token expired. Please log in again.");

const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  // Sequelize errors
  if (err.name === "SequelizeValidationError")
    error = handleSequelizeValidation(err);
  if (err.name === "SequelizeUniqueConstraintError")
    error = handleSequelizeUnique(err);
  if (err.name === "SequelizeForeignKeyConstraintError")
    error = new ValidationError("Related resource does not exist");

  // JWT errors
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpired();

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : "Something went wrong";

  // Log non-operational errors with full stack
  if (!error.isOperational) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// ─────────────────────────────────────────────
// Global Error Middleware
// ─────────────────────────────────────────────

const globalErrorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || 500;

  let message = err.message || "Internal Server Error";

  // Sequelize Validation Error
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;

    message = err.errors?.map((e) => e.message).join(", ");
  }

  // Sequelize Unique Constraint
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;

    message = err.errors?.map((e) => e.message).join(", ");
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;

    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;

    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    status: `${statusCode}`.startsWith("4") ? "fail" : "error",

    message,

    ...(process.env.NODE_ENV === "development"
      ? {
          stack: err.stack,
        }
      : {}),
  });
};

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  globalErrorHandler,
};
