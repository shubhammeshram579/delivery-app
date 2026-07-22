// const aiService = require('../services/ai.service');

// // ── Customer: AI Booking Assistant ────────────────────────
// const bookingAssistant = async (req, res) => {
//   try {
//     const { message } = req.body;

//     if (!message?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Message is required'
//       });
//     }

//     const result = await aiService.bookingAssistant(message);

//     return res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Customer: AI Price Explainer ──────────────────────────
// const explainPrice = async (req, res) => {
//   try {
//     const { totalAmount, basePrice, deliveryFee, distance, weight, vehicleType } = req.body;

//     const result = await aiService.explainPrice({ 
//       totalAmount, 
//       basePrice, 
//       deliveryFee, 
//       distance, 
//       weight, 
//       vehicleType 
//     });

//     return res.json({
//       success: true,
//       data: { explanation: result.response }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Customer: AI Packaging Advisor ────────────────────────
// const packagingAdvice = async (req, res) => {
//   try {
//     const { item } = req.body;

//     if (!item?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Item description is required'
//       });
//     }

//     const result = await aiService.packagingAdvice(item);

//     return res.json({
//       success: true,
//       data: { advice: result.response }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Driver: AI Smart Reply ────────────────────────────────
// const smartReply = async (req, res) => {
//   try {
//     const { customerMessage, orderStatus } = req.body;

//     if (!customerMessage?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Customer message is required'
//       });
//     }

//     const result = await aiService.generateSmartReply({ customerMessage, orderStatus });

//     return res.json({
//       success: true,
//       data: { reply: result.response }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Driver: AI Delivery Notes Summarizer ─────────────────
// const summarizeNotes = async (req, res) => {
//   try {
//     const { notes } = req.body;

//     if (!notes?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Notes are required'
//       });
//     }

//     const result = await aiService.summarizeDeliveryNotes(notes);

//     return res.json({
//       success: true,
//       data: { summary: result.response }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Admin: AI Operations Query ────────────────────────────
// const adminQuery = async (req, res) => {
//   try {
//     const { question } = req.body;

//     if (!question?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Question is required'
//       });
//     }

//     const result = await aiService.adminQuery(question);

//     return res.json({
//       success: true,
//       data: { 
//         answer: result.response, 
//         iterations: result.iterations 
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ── Admin: AI Fraud Detection ─────────────────────────────
// const detectFraud = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const result = await aiService.detectFraud(driverId);

//     return res.json({
//       success: true,
//       data: { analysis: result.response }
//     });
//   } catch (error) {
//     console.error(error);
//     const statusCode = error.statusCode || 500;
//     return res.status(statusCode).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// module.exports = {
//   bookingAssistant,
//   explainPrice,
//   packagingAdvice,
//   smartReply,
//   summarizeNotes,
//   adminQuery,
//   detectFraud
// };



const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError } = require('../middleware/error.middleware');

// ── Customer: AI Booking Assistant ────────────────────────
const bookingAssistant = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    throw new ValidationError('Message is required');
  }

  const result = await aiService.bookingAssistant(message);

  res.json({
    success: true,
    data: result
  });
});

// ── Customer: AI Price Explainer ──────────────────────────
const explainPrice = asyncHandler(async (req, res) => {
  const { totalAmount, basePrice, deliveryFee, distance, weight, vehicleType } = req.body;

  const result = await aiService.explainPrice({ 
    totalAmount, 
    basePrice, 
    deliveryFee, 
    distance, 
    weight, 
    vehicleType 
  });

  res.json({
    success: true,
    data: { explanation: result.response }
  });
});

// ── Customer: AI Packaging Advisor ────────────────────────
const packagingAdvice = asyncHandler(async (req, res) => {
  const { item } = req.body;

  if (!item?.trim()) {
    throw new ValidationError('Item description is required');
  }

  const result = await aiService.packagingAdvice(item);

  res.json({
    success: true,
    data: { advice: result.response }
  });
});

// ── Driver: AI Smart Reply ────────────────────────────────
const smartReply = asyncHandler(async (req, res) => {
  const { customerMessage, orderStatus } = req.body;

  if (!customerMessage?.trim()) {
    throw new ValidationError('Customer message is required');
  }

  const result = await aiService.generateSmartReply({ customerMessage, orderStatus });

  res.json({
    success: true,
    data: { reply: result.response }
  });
});

// ── Driver: AI Delivery Notes Summarizer ─────────────────
const summarizeNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  if (!notes?.trim()) {
    throw new ValidationError('Notes are required');
  }

  const result = await aiService.summarizeDeliveryNotes(notes);

  res.json({
    success: true,
    data: { summary: result.response }
  });
});

// ── Admin: AI Operations Query ────────────────────────────
const adminQuery = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question?.trim()) {
    throw new ValidationError('Question is required');
  }

  const result = await aiService.adminQuery(question);

  res.json({
    success: true,
    data: { 
      answer: result.response, 
      iterations: result.iterations 
    }
  });
});

// ── Admin: AI Fraud Detection ─────────────────────────────
const detectFraud = asyncHandler(async (req, res) => {
  const { driverId } = req.params;

  const result = await aiService.detectFraud(driverId);

  res.json({
    success: true,
    data: { analysis: result.response }
  });
});

module.exports = {
  bookingAssistant,
  explainPrice,
  packagingAdvice,
  smartReply,
  summarizeNotes,
  adminQuery,
  detectFraud
};