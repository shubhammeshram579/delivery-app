const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { 
  sendMessage, 
  getMessageHistory, 
  markMessagesAsRead, 
  getConversationsList 
} = require('../controllers/chat.controller');

// Apply authentication middleware to all chat routes
router.use(protect);

// Define routes using ES6 controller imports
router.post('/:orderId', sendMessage);
router.get('/conversations/list', getConversationsList);
router.get('/:orderId', getMessageHistory);
router.patch('/:orderId/read', markMessagesAsRead);

module.exports = router;