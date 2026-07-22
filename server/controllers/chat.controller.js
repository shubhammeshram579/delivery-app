const chatService = require('../services/chat.service');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, AuthenticationError } = require('../middleware/error.middleware');

const sendMessage = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { message, senderRole } = req.body;

  if (!message?.trim()) {
    throw new ValidationError('Message is required');
  }

  const msg = await chatService.sendMessage({
    orderId,
    message,
    senderRole,
    user: req.user
  });

  return res.status(201).json({
    success: true,
    data: { message: msg }
  });
});

const getMessageHistory = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!req.user) {
    throw new AuthenticationError('Authentication required. Please log in.');
  }

  const messages = await chatService.getMessageHistory({
    orderId,
    user: req.user
  });

  return res.json({
    success: true,
    data: { messages }
  });
});

const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  await chatService.markMessagesAsRead({
    orderId,
    userId: req.user.id
  });

  return res.json({ 
    success: true, 
    message: 'Messages marked as read' 
  });
});

const getConversationsList = asyncHandler(async (req, res) => {
  const conversations = await chatService.getConversationsList({
    user: req.user
  });

  return res.json({ 
    success: true, 
    data: { conversations } 
  });
});

module.exports = {
  sendMessage,
  getMessageHistory,
  markMessagesAsRead,
  getConversationsList
};