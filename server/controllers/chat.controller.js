const chatService = require('../services/chat.service');

const sendMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { message, senderRole } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
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
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

const getMessageHistory = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Guard check: ensures req.user is populated by your authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const messages = await chatService.getMessageHistory({
      orderId,
      user: req.user
    });

    return res.json({
      success: true,
      data: { messages }
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

const markMessagesAsRead = async (req, res) => {
  try {
    const { orderId } = req.params;

    await chatService.markMessagesAsRead({
      orderId,
      userId: req.user.id
    });

    return res.json({ 
      success: true, 
      message: 'Messages marked as read' 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getConversationsList = async (req, res) => {
  try {
    const conversations = await chatService.getConversationsList({
      user: req.user
    });

    return res.json({ 
      success: true, 
      data: { conversations } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getMessageHistory,
  markMessagesAsRead,
  getConversationsList
};