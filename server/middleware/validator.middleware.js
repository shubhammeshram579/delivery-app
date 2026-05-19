const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('./error.middleware');

// Run validations and throw if any fail
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    throw new ValidationError(messages);
  }
  next();
};

// ── Auth validators ───────────────────────────────────────
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number'),
  body('phone').trim().isMobilePhone().withMessage('Valid phone number required'),
  body('role').optional().isIn(['customer', 'driver']).withMessage('Role must be customer or driver'),
  validate,
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const otpValidator = [
  body('email').trim().isEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate,
];

// ── Order validators ──────────────────────────────────────
const createOrderValidator = [
  body('pickupAddress').trim().notEmpty().withMessage('Pickup address required'),
  body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('dropAddress').trim().notEmpty().withMessage('Drop address required'),
  body('dropLat').isFloat({ min: -90, max: 90 }).withMessage('Valid drop latitude required'),
  body('dropLng').isFloat({ min: -180, max: 180 }).withMessage('Valid drop longitude required'),
  body('packageWeight').isFloat({ min: 0.1 }).withMessage('Package weight must be positive'),
  body('packageDescription').optional().trim().isLength({ max: 500 }),
  validate,
];

// ── Driver validators ─────────────────────────────────────
const updateLocationValidator = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  validate,
];

// ── Pagination ─────────────────────────────────────────────
const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  otpValidator,
  createOrderValidator,
  updateLocationValidator,
  paginationValidator,
};
