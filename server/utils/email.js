const logger = require('./logger');

// Lazy init transporter
let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    const nodemailer = require('nodemailer');
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
};

const templates = {
  'verify-email': ({ name, otp }) => ({
    subject: 'Verify your email — Delivery App',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2>Hi ${name},</h2>
        <p>Your email verification code is:</p>
        <h1 style="letter-spacing:8px;text-align:center;background:#f5f5f5;padding:20px;border-radius:8px">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
      </div>
    `,
  }),
  'reset-password': ({ name, resetUrl }) => ({
    subject: 'Reset your password — Delivery App',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2>Hi ${name},</h2>
        <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#333;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset Password</a>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`Email not configured — skipping email to ${to}`);
    // In development, log the OTP to console so you can still test
    if (data?.otp) logger.info(`[DEV] OTP for ${to}: ${data.otp}`);
    if (data?.resetUrl) logger.info(`[DEV] Reset URL for ${to}: ${data.resetUrl}`);
    return;
  }

  try {
    const templateContent = template ? templates[template]?.(data) : null;
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'noreply@deliveryapp.com',
      to,
      subject: templateContent?.subject || subject,
      html: templateContent?.html || html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Email send failed:', error);
  }
};

module.exports = { sendEmail };
