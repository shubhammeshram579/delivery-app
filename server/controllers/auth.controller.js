// const authService = require('../services/auth.service');

// const register = async (req, res) => {
//   const data = await authService.register(req.body);
//   res.status(201).json({ success: true, message: 'Registration successful. Check email for OTP.', data });
// };

// const login = async (req, res) => {
//   const data = await authService.login(req.body);
//   res.json({ success: true, message: 'Login successful', data });
// };

// const verifyEmail = async (req, res) => {
//   const data = await authService.verifyEmailOtp(req.body);
//   res.json({ success: true, ...data });
// };

// const resendOtp = async (req, res) => {
//   const data = await authService.resendEmailOtp(req.body.email);
//   res.json({ success: true, ...data });
// };

// const refreshToken = async (req, res) => {
//   const data = await authService.refreshAccessToken(req.body.refreshToken);
//   res.json({ success: true, data });
// };

// const logout = async (req, res) => {
//   const data = await authService.logout(req.user.id, req.token);
//   res.json({ success: true, ...data });
// };

// const forgotPassword = async (req, res) => {
//   const data = await authService.forgotPassword(req.body.email);
//   res.json({ success: true, ...data });
// };

// const resetPassword = async (req, res) => {
//   const data = await authService.resetPassword(req.body);
//   res.json({ success: true, ...data });
// };

// const getMe = async (req, res) => {
//   res.json({ success: true, data: { user: req.user } });
// };

// module.exports = { register, login, verifyEmail, resendOtp, refreshToken, logout, forgotPassword, resetPassword, getMe };


const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);

  res.cookie('refreshToken', data.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify email.',
    data: {
      user: data.user,
      accessToken: data.accessToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);

  res.cookie('refreshToken', data.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: data.user,
      accessToken: data.accessToken,
    },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifyEmailOtp(req.body);

  res.status(200).json({
    success: true,
    ...data,
  });
});

const resendOtp = asyncHandler(async (req, res) => {
  const data = await authService.resendEmailOtp(req.body.email);

  res.status(200).json({
    success: true,
    ...data,
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const token =
    req.cookies.refreshToken || req.body.refreshToken;

  const data = await authService.refreshAccessToken(token);

  res.cookie('refreshToken', data.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    data: {
      accessToken: data.accessToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.token;

  const data = await authService.logout(
    req.user.id,
    token
  );

  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    ...data,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(
    req.body.email
  );

  res.status(200).json({
    success: true,
    ...data,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);

  res.status(200).json({
    success: true,
    ...data,
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = {
  register,
  login,
  verifyEmail,
  resendOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};