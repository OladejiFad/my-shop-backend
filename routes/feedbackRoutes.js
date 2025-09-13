const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming auth middleware for user verification

// Submit feedback (suggestions, bug reports, etc.)
router.post('/submit-feedback', verifyToken, submitFeedback);

module.exports = router;
