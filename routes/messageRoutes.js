const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');

// No auth middleware added here, guests allowed to access freely

// Send a message (POST /api/messages/send)
router.post('/send', messageController.sendMessage);

// Get messages between two users (GET /api/messages)
router.get('/', messageController.getMessages);

// Mark messages as read (POST /api/messages/read)
router.post('/read', messageController.markAsRead);

// Get all messages for a user (GET /api/messages/all?userId=xxx)
router.get('/all', messageController.getAllMessages);

module.exports = router;
