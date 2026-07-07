const aiService = require('../services/ai.service');

// ── Customer: AI Booking Assistant ────────────────────────
const bookingAssistant = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await aiService.bookingAssistant(message);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Customer: AI Price Explainer ──────────────────────────
const explainPrice = async (req, res) => {
  try {
    const { totalAmount, basePrice, deliveryFee, distance, weight, vehicleType } = req.body;

    const result = await aiService.explainPrice({ 
      totalAmount, 
      basePrice, 
      deliveryFee, 
      distance, 
      weight, 
      vehicleType 
    });

    return res.json({
      success: true,
      data: { explanation: result.response }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Customer: AI Packaging Advisor ────────────────────────
const packagingAdvice = async (req, res) => {
  try {
    const { item } = req.body;

    if (!item?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item description is required'
      });
    }

    const result = await aiService.packagingAdvice(item);

    return res.json({
      success: true,
      data: { advice: result.response }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Driver: AI Smart Reply ────────────────────────────────
const smartReply = async (req, res) => {
  try {
    const { customerMessage, orderStatus } = req.body;

    if (!customerMessage?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer message is required'
      });
    }

    const result = await aiService.generateSmartReply({ customerMessage, orderStatus });

    return res.json({
      success: true,
      data: { reply: result.response }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Driver: AI Delivery Notes Summarizer ─────────────────
const summarizeNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notes are required'
      });
    }

    const result = await aiService.summarizeDeliveryNotes(notes);

    return res.json({
      success: true,
      data: { summary: result.response }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Admin: AI Operations Query ────────────────────────────
const adminQuery = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const result = await aiService.adminQuery(question);

    return res.json({
      success: true,
      data: { 
        answer: result.response, 
        iterations: result.iterations 
      }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ── Admin: AI Fraud Detection ─────────────────────────────
const detectFraud = async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await aiService.detectFraud(driverId);

    return res.json({
      success: true,
      data: { analysis: result.response }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  bookingAssistant,
  explainPrice,
  packagingAdvice,
  smartReply,
  summarizeNotes,
  adminQuery,
  detectFraud
};