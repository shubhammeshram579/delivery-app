// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const { User, Driver } = require('../models');
// const { cacheSet, cacheGet, cacheDel } = require('../config/redis');
// const { sendEmail } = require('../utils/email');
// const { sendSMS } = require('../utils/sms');
// const {
//   AuthenticationError,
//   ConflictError,
//   ValidationError,
//   NotFoundError,
// } = require('../middleware/error.middleware');

// // ── Token generation ──────────────────────────────────────
// const generateTokens = (userId) => {
//   const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d',
//   });
//   const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
//     expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
//   });
//   return { accessToken, refreshToken };
// };

// // ── Register ──────────────────────────────────────────────
// const register = async ({ name, email, password, phone, role = 'customer' }) => {
//   const existing = await User.scope('withPassword').findOne({ where: { email } });
//   if (existing) throw new ConflictError('Email already registered');

//   const existingPhone = await User.findOne({ where: { phone } });
//   if (existingPhone) throw new ConflictError('Phone number already registered');

//   const user = await User.create({ name, email, password, phone, role });

//   // Generate and cache OTP for email verification
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   await cacheSet(`otp:email:${email}`, otp, 10 * 60); // 10 minutes

//   await sendEmail({
//     to: email,
//     subject: 'Verify your email — Delivery App',
//     template: 'verify-email',
//     data: { name, otp },
//   });

//   const { accessToken, refreshToken } = generateTokens(user.id);
//   await User.update({ refreshToken }, { where: { id: user.id } });

//   return {
//     user: { id: user.id, name: user.name, email: user.email, role: user.role },
//     accessToken,
//     refreshToken,
//   };
// };

// // ── Login ─────────────────────────────────────────────────
// const login = async ({ email, password }) => {
//   const user = await User.scope('withPassword').findOne({ where: { email } });
//   if (!user) throw new AuthenticationError('Invalid email or password');

//   const isMatch = await user.comparePassword(password);
//   if (!isMatch) throw new AuthenticationError('Invalid email or password');

//   if (!user.isActive) throw new AuthenticationError('Account deactivated. Contact support.');

//   const { accessToken, refreshToken } = generateTokens(user.id);
//   await User.update(
//     { refreshToken, lastLoginAt: new Date() },
//     { where: { id: user.id } }
//   );

//   console.log("user",user)

//   return {
//     user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
//     accessToken,
//     refreshToken,
//   };
// };

// // ── Email OTP Verify ──────────────────────────────────────
// const verifyEmailOtp = async ({ email, otp }) => {
//   const cached = await cacheGet(`otp:email:${email}`);
//   if (!cached || cached !== otp) throw new ValidationError('Invalid or expired OTP');

//   await User.update({ isEmailVerified: true }, { where: { email } });
//   await cacheDel(`otp:email:${email}`);

//   return { message: 'Email verified successfully' };
// };

// // ── Resend OTP ────────────────────────────────────────────
// const resendEmailOtp = async (email) => {
//   const user = await User.findOne({ where: { email } });
//   if (!user) throw new NotFoundError('User');

//   // Prevent spam: check if OTP was recently sent
//   const existing = await cacheGet(`otp:email:${email}`);
//   if (existing) throw new ValidationError('OTP already sent. Please wait before requesting again.');

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   await cacheSet(`otp:email:${email}`, otp, 10 * 60);
//   await sendEmail({ to: email, subject: 'New OTP — Delivery App', template: 'verify-email', data: { name: user.name, otp } });

//   return { message: 'OTP sent successfully' };
// };

// // ── Refresh Token ─────────────────────────────────────────
// const refreshAccessToken = async (refreshToken) => {
//   if (!refreshToken) throw new AuthenticationError('Refresh token required');

//   const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
//   const user = await User.scope('withPassword').findByPk(decoded.id);

//   if (!user || user.refreshToken !== refreshToken)
//     throw new AuthenticationError('Invalid refresh token');

//   const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
//   await User.update({ refreshToken: newRefreshToken }, { where: { id: user.id } });

//   return { accessToken, refreshToken: newRefreshToken };
// };

// // ── Logout ────────────────────────────────────────────────
// const logout = async (userId, token) => {
//   // Blacklist access token until it expires (7d max)
//   await cacheSet(`blacklist:${token}`, '1', 7 * 24 * 60 * 60);
//   await User.update({ refreshToken: null }, { where: { id: userId } });
//   return { message: 'Logged out successfully' };
// };

// // ── Forgot Password ───────────────────────────────────────
// const forgotPassword = async (email) => {
//   const user = await User.findOne({ where: { email } });
//   if (!user) return { message: 'If email exists, reset link has been sent' }; // Security: don't reveal

//   const resetToken = crypto.randomBytes(32).toString('hex');
//   await cacheSet(`reset:${resetToken}`, user.id, 30 * 60); // 30 minutes

//   const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
//   await sendEmail({
//     to: email,
//     subject: 'Password Reset — Delivery App',
//     template: 'reset-password',
//     data: { name: user.name, resetUrl },
//   });

//   return { message: 'If email exists, reset link has been sent' };
// };

// // ── Reset Password ────────────────────────────────────────
// const resetPassword = async ({ token, newPassword }) => {
//   const userId = await cacheGet(`reset:${token}`);
//   if (!userId) throw new ValidationError('Reset token is invalid or expired');

//   await User.update({ password: newPassword }, { where: { id: userId } });
//   await cacheDel(`reset:${token}`);

//   return { message: 'Password reset successfully' };
// };

// module.exports = {
//   register, login, verifyEmailOtp, resendEmailOtp,
//   refreshAccessToken, logout, forgotPassword, resetPassword,
// };

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { sequelize } = require("../config/database");

const { User, Driver } = require("../models");

const { cacheSet, cacheGet, cacheDel } = require("../config/redis");

const { sendEmail } = require("../utils/email");

const {
  AuthenticationError,
  ConflictError,
  ValidationError,
  NotFoundError,
} = require("../middleware/error.middleware");

// ─────────────────────────────────────────────
// Generate Tokens
// ─────────────────────────────────────────────

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    {
      id: userId,
      type: "access",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: userId,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
  );

  return {
    accessToken,
    refreshToken,
  };
};

const register = async ({
  name,
  email,
  password,
  phone,
  role = "customer",

  // driver fields
  vehicleType,
  vehicleNumber,
  licenseNumber,
}) => {
  const transaction = await sequelize.transaction();

  try {
    email = email.toLowerCase().trim();

    if (!name || !email || !password || !phone) {
      throw new ValidationError("All fields are required");
    }

    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    const existingUser = await User.scope("withPassword").findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const existingPhone = await User.findOne({
      where: { phone },
    });

    if (existingPhone) {
      throw new ConflictError("Phone already registered");
    }

    // Create User
    const user = await User.create(
      {
        name,
        email,
        password,
        phone,
        role,
      },
      {
        transaction,
      },
    );

    // Create Driver Profile
    if (role === "driver") {
      if (!vehicleType || !vehicleNumber || !licenseNumber) {
        throw new ValidationError("Driver details required");
      }

      await Driver.create(
        {
          userId: user.id,

          vehicleType,

          vehicleNumber,

          licenseNumber,

          isVerified: false,
        },
        {
          transaction,
        },
      );
    }

    // Commit Transaction
    await transaction.commit();

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await cacheSet(`otp:email:${email}`, otp, 10 * 60);

    await sendEmail({
      to: email,
      subject: "Verify Your Email",

      template: "verify-email",

      data: {
        name,
        otp,
      },
    });

    // Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    await User.update(
      {
        refreshToken,
      },
      {
        where: {
          id: user.id,
        },
      },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      accessToken,

      refreshToken,
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────

const login = async ({ email, password }) => {
  email = email.toLowerCase().trim();

  if (!email || !password) {
    throw new ValidationError("Email and password required");
  }

  const user = await User.scope("withPassword").findOne({
    where: { email },
  });

  if (!user) {
    throw new AuthenticationError("Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AuthenticationError("Invalid credentials");
  }

  if (!user.isActive) {
    throw new AuthenticationError("Account is deactivated");
  }

  if (!user.isEmailVerified) {
    throw new AuthenticationError("Please verify your email first");
  }

  // Driver verification check
  if (user.role === "driver") {
    const driver = await Driver.findOne({
      where: {
        userId: user.id,
      },
    });

    if (!driver) {
      throw new AuthenticationError("Driver profile not found");
    }

    if (!driver.isVerified) {
      throw new AuthenticationError("Driver account not verified");
    }
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  await User.update(
    {
      refreshToken,
      lastLoginAt: new Date(),
    },
    {
      where: {
        id: user.id,
      },
    },
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },

    accessToken,
    refreshToken,
  };
};

// ─────────────────────────────────────────────
// Verify Email OTP
// ─────────────────────────────────────────────

const verifyEmailOtp = async ({ email, otp }) => {
  email = email.toLowerCase().trim();

  const cachedOtp = await cacheGet(`otp:email:${email}`);

  if (!cachedOtp || cachedOtp !== otp) {
    throw new ValidationError("Invalid or expired OTP");
  }

  await User.update(
    {
      isEmailVerified: true,
    },
    {
      where: { email },
    },
  );

  await cacheDel(`otp:email:${email}`);

  return {
    message: "Email verified successfully",
  };
};

// ─────────────────────────────────────────────
// Resend OTP
// ─────────────────────────────────────────────

const resendEmailOtp = async (email) => {
  email = email.toLowerCase().trim();

  const user = await User.findOne({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  const existingOtp = await cacheGet(`otp:email:${email}`);

  if (existingOtp) {
    throw new ValidationError("OTP already sent recently");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await cacheSet(`otp:email:${email}`, otp, 10 * 60);

  await sendEmail({
    to: email,
    subject: "New OTP",
    template: "verify-email",
    data: {
      name: user.name,
      otp,
    },
  });

  return {
    message: "OTP sent successfully",
  };
};

// ─────────────────────────────────────────────
// Refresh Access Token
// ─────────────────────────────────────────────

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AuthenticationError("Refresh token required");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AuthenticationError("Invalid refresh token");
  }

  const user = await User.scope("withPassword").findByPk(decoded.id);

  if (!user || user.refreshToken !== refreshToken) {
    throw new AuthenticationError("Invalid refresh token");
  }

  const tokens = generateTokens(user.id);

  await User.update(
    {
      refreshToken: tokens.refreshToken,
    },
    {
      where: {
        id: user.id,
      },
    },
  );

  return tokens;
};

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────

const logout = async (userId, token) => {
  const decoded = jwt.decode(token);

  const ttl = decoded.exp - Math.floor(Date.now() / 1000);

  await cacheSet(`blacklist:${token}`, "1", ttl);

  await User.update(
    {
      refreshToken: null,
    },
    {
      where: {
        id: userId,
      },
    },
  );

  return {
    message: "Logged out successfully",
  };
};

// ─────────────────────────────────────────────
// Forgot Password
// ─────────────────────────────────────────────

const forgotPassword = async (email) => {
  email = email.toLowerCase().trim();

  const user = await User.findOne({
    where: { email },
  });

  if (!user) {
    return {
      message: "If email exists, reset link sent",
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  await cacheSet(`reset:${resetToken}`, user.id, 30 * 60);

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: "Reset Password",
    template: "reset-password",
    data: {
      name: user.name,
      resetUrl,
    },
  });

  return {
    message: "If email exists, reset link sent",
  };
};

// ─────────────────────────────────────────────
// Reset Password
// ─────────────────────────────────────────────

const resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) {
    throw new ValidationError("Token and password required");
  }

  if (newPassword.length < 6) {
    throw new ValidationError("Password too short");
  }

  const userId = await cacheGet(`reset:${token}`);

  if (!userId) {
    throw new ValidationError("Invalid or expired token");
  }

  await User.update(
    {
      password: newPassword,
    },
    {
      where: {
        id: userId,
      },
      individualHooks: true,
    },
  );

  await cacheDel(`reset:${token}`);

  return {
    message: "Password reset successfully",
  };
};

module.exports = {
  register,
  login,
  verifyEmailOtp,
  resendEmailOtp,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
