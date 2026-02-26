const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/create', isAuthenticated, chatController.createChat);
router.get('/:chatId', isAuthenticated, chatController.getChatHistory);
router.post('/message', isAuthenticated, chatController.sendMessage);

module.exports = router;
