const Message = require('../models/messageModel');

// Send message - no token required for guests, relies on senderId/receiverId in body
exports.sendMessage = async (req, res) => {
  try {
    console.log('SendMessage called with body:', req.body);

    const {
      senderId,
      receiverId,
      senderName,
      receiverName,
      message,
      propertyId,
    } = req.body;

    if (!senderId || !receiverId || !message || !receiverName) {
      console.warn('sendMessage missing required fields');
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      senderName,
      receiverName,
      message,
      propertyId,
    });

    const savedMessage = await newMessage.save();
    console.log('Message saved:', savedMessage);

    // Emit socket.io event if available
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('new-message', savedMessage);
      console.log(`Emitted new-message to room ${receiverId}`);
    } else {
      console.warn('Socket.io instance not found on app');
    }

    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Get messages between two users, optionally filtered by propertyId
exports.getMessages = async (req, res) => {
  try {
    console.log('getMessages called with query:', req.query);
    const { user1, user2, propertyId } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ message: 'Missing user IDs.' });
    }

    const filter = {
      $or: [
        { senderId: user1, receiverId: user2, ...(propertyId ? { propertyId } : {}) },
        { senderId: user2, receiverId: user1, ...(propertyId ? { propertyId } : {}) },
      ],
    };

    const messages = await Message.find(filter).sort({ createdAt: 1 });
    console.log(`Found ${messages.length} messages`);
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Mark messages as read (optional token)
exports.markAsRead = async (req, res) => {
  try {
    console.log('markAsRead called with body:', req.body);
    const { senderId, receiverId, propertyId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Missing IDs.' });
    }

    const filter = {
      senderId,
      receiverId,
      read: false,
    };

    if (propertyId) filter.propertyId = propertyId;

    const updateResult = await Message.updateMany(filter, { read: true });
    console.log('markAsRead updated messages count:', updateResult.modifiedCount);

    res.json({ message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Get all messages for a user - no auth required, userId passed as query param
exports.getAllMessages = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId query parameter.' });
    }
    console.log('Fetching all messages for user:', userId);

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error('Get all messages error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};
