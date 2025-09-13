// routes/refundRoutes.js
const express = require('express');
const router = express.Router();
const { requestRefund, handleRefundRequest } = require('../controllers/refundController');
const { verifyToken, verifyAdmin, verifyBuyer } = require('../middleware/authMiddleware');

// Buyer requests a refund
router.post('/request', verifyToken, verifyBuyer, requestRefund);

// Admin handles a refund request
router.put('/handle', verifyToken, verifyAdmin, handleRefundRequest);

module.exports = router;
