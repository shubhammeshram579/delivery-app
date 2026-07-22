const jwt = require("jsonwebtoken");

const {
  AuthenticationError,
  AuthorizationError,
} = require("./error.middleware");

const { cacheGet } = require("../config/redis");

// const User = require('../models/User');
const { User } = require("../models");

// ─────────────────────────────────────────────
// Protect Middleware
// ─────────────────────────────────────────────

const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // No token
    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    // Check blacklist
    const isBlacklisted = await cacheGet(`blacklist:${token}`);

    if (isBlacklisted) {
      throw new AuthenticationError("Token expired. Please login again");
    }

    // Verify token
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError("Invalid or expired token");
    }

    // Verify token type
    if (decoded.type !== "access") {
      throw new AuthenticationError("Invalid access token");
    }

    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: {
        exclude: ["password", "refreshToken"],
      },
    });

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account deactivated");
    }

    // Attach request data
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Role Restriction Middleware
// ─────────────────────────────────────────────

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Access denied. Allowed roles: ${roles.join(", ")}`,
        ),
      );
    }

    next();
  };
};

// ─────────────────────────────────────────────
// Optional Authentication
// ─────────────────────────────────────────────

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Only allow access tokens
      if (decoded.type === "access") {
        const user = await User.findByPk(decoded.id, {
          attributes: {
            exclude: ["password", "refreshToken"],
          },
        });

        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // Ignore optional auth errors
  }

  next();
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth,
};
