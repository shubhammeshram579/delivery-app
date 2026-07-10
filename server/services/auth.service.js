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

const {notifyAdmins} = require("../utils/adminNotification")

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


// ─────────────────────────────────────────────
// Admin Registration
// ─────────────────────────────────────────────
// Admin Registration with Email OTP Verification
// ─────────────────────────────────────────────

const registerAdmin = async ({ name, email, password, phone }) => {
  const transaction = await sequelize.transaction();

  try {
    email = email.toLowerCase().trim();

    // 1. Validation
    if (!name || !email || !password || !phone) {
      throw new ValidationError("All fields are required");
    }

    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    // 2. Check existing constraints
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

    // 3. Create Admin User (Setting verification flags to false initially)
    const adminUser = await User.create(
      {
        name,
        email,
        password,
        phone,
        role: "admin",
        isActive: true,
        isEmailVerified: false, // Must verify via OTP
        isPhoneVerified: false,
      },
      {
        transaction,
      },
    );

    // Commit Transaction
    await transaction.commit();

    // 4. Generate OTP & Cache in Redis (Matches your regular user registration)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await cacheSet(`otp:email:${email}`, otp, 10 * 60);

    // Send the OTP email
    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      template: "verify-email",
      data: {
        name,
        otp,
      },
    });

    // 5. Generate Auth Tokens
    const { accessToken, refreshToken } = generateTokens(adminUser.id);

    // Save refresh token to database
    await User.update(
      {
        refreshToken,
      },
      {
        where: {
          id: adminUser.id,
        },
      },
    );

    // 6. Return Response Payload
    return {
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


// customer and driver register 
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

    
    await notifyAdmins({
      title: "👤 New Driver Registration",
      body: `${user.name} has registered as a new driver and is waiting for verification.`,
      type: "system",
      data: {
        userId: user.id,
        driverId: driver.id,
        driverName: user.name,
        vehicleType,
        vehicleNumber,
      },
    });

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

    // if (!driver.isVerified) {
    //   throw new AuthenticationError("Driver account not verified");
    // }
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

// const forgotPassword = async (email) => {
//   email = email.toLowerCase().trim();

//   const user = await User.findOne({
//     where: { email },
//   });

//   if (!user) {
//     return {
//       message: "If email exists, reset link sent",
//     };
//   }

//   const resetToken = crypto.randomBytes(32).toString("hex");

//   await cacheSet(`reset:${resetToken}`, user.id, 30 * 60);

//   const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

//   await sendEmail({
//     to: email,
//     subject: "Reset Password",
//     template: "reset-password",
//     data: {
//       name: user.name,
//       resetUrl,
//     },
//   });

//   return {
//     message: "If email exists, reset link sent",
//   };
// };

// // ─────────────────────────────────────────────
// // Reset Password
// // ─────────────────────────────────────────────

// const resetPassword = async ({ token, newPassword }) => {
//   if (!token || !newPassword) {
//     throw new ValidationError("Token and password required");
//   }

//   if (newPassword.length < 6) {
//     throw new ValidationError("Password too short");
//   }

//   const userId = await cacheGet(`reset:${token}`);

//   if (!userId) {
//     throw new ValidationError("Invalid or expired token");
//   }

//   await User.update(
//     {
//       password: newPassword,
//     },
//     {
//       where: {
//         id: userId,
//       },
//       individualHooks: true,
//     },
//   );

//   await cacheDel(`reset:${token}`);

//   return {
//     message: "Password reset successfully",
//   };
// };


// ─────────────────────────────────────────────
// Forgot Password — Send OTP (not link)
// ─────────────────────────────────────────────

const forgotPassword = async (email) => {
  email = email.toLowerCase().trim();

  const user = await User.findOne({ where: { email } });

  // Security: don't reveal if email exists or not
  if (!user) {
    return { message: 'If this email exists, an OTP has been sent' };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP for 10 minutes
  await cacheSet(`reset-otp:${email}`, otp, 10 * 60);

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    template: 'verify-email', // reuse same OTP template
    data: { name: user.name, otp },
  });

  return { message: 'If this email exists, an OTP has been sent' };
};

// ─────────────────────────────────────────────
// Verify Reset OTP — Returns a short-lived reset token
// ─────────────────────────────────────────────

const verifyResetOtp = async ({ email, otp }) => {
  email = email.toLowerCase().trim();

  const cachedOtp = await cacheGet(`reset-otp:${email}`);

  if (!cachedOtp || cachedOtp !== otp) {
    throw new ValidationError('Invalid or expired OTP');
  }

  // OTP correct — generate a one-time reset token (valid 15 min)
  const resetToken = crypto.randomBytes(32).toString('hex');

  await cacheSet(`reset-token:${resetToken}`, email, 15 * 60);

  // Delete OTP so it can't be reused
  await cacheDel(`reset-otp:${email}`);

  return {
    message: 'OTP verified successfully',
    resetToken,
  };
};

// ─────────────────────────────────────────────
// Reset Password — Uses resetToken from verifyResetOtp
// ─────────────────────────────────────────────

const resetPassword = async ({ resetToken, newPassword }) => {
  if (!resetToken || !newPassword) {
    throw new ValidationError('Reset token and password required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('Password too short');
  }

  const email = await cacheGet(`reset-token:${resetToken}`);

  if (!email) {
    throw new ValidationError('Reset session expired. Please start again.');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new NotFoundError('User');
  }

  await User.update(
    { password: newPassword },
    { where: { id: user.id }, individualHooks: true }
  );

  // Clean up — invalidate the reset token so it can't be reused
  await cacheDel(`reset-token:${resetToken}`);

  // Also invalidate any existing sessions for security
  await User.update(
    { refreshToken: null },
    { where: { id: user.id } }
  );

  return { message: 'Password reset successfully' };
};

// ─────────────────────────────────────────────
// Resend Reset OTP
// ─────────────────────────────────────────────

const resendResetOtp = async (email) => {
  email = email.toLowerCase().trim();

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { message: 'If this email exists, an OTP has been sent' };
  }

  const existingOtp = await cacheGet(`reset-otp:${email}`);
  if (existingOtp) {
    throw new ValidationError('OTP already sent. Please wait before requesting again.');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await cacheSet(`reset-otp:${email}`, otp, 10 * 60);

  await sendEmail({
    to: email,
    subject: 'New Password Reset OTP',
    template: 'verify-email',
    data: { name: user.name, otp },
  });

  return { message: 'OTP sent successfully' };
};


module.exports = {
  registerAdmin,
  register,
  login,
  verifyEmailOtp,
  resendEmailOtp,
  refreshAccessToken,
  logout,
  
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendResetOtp,
};
