const logger = require('./logger');

// Lazy init - only create client when actually used
let _client = null;
const getTwilio = () => {
  if (!_client) {
    const twilio = require('twilio');
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
};

const sendSMS = async ({ to, message }) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio not configured — skipping SMS to ' + to);
    return;
  }
  try {
    await getTwilio().messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`SMS sent to ${to}`);
  } catch (error) {
    logger.error('SMS send failed:', error);
    // Don't throw — SMS failure shouldn't crash the request
  }
};

const sendOtpSMS = async (phone, otp) => {
  await sendSMS({
    to: phone,
    message: `Your Delivery App OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
  });
};

module.exports = { sendSMS, sendOtpSMS };
