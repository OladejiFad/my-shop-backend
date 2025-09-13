const express = require('express');
const router = express.Router();
const {
  trackByBuyer,
  trackBySeller,
  updateShipmentStatus,
  updateSatisfactionStatus
} = require('../controllers/trackingController');
const { verifyToken, isSeller } = require('../middleware/authMiddleware');
const authenticateBuyerToken = require('../middleware/authenticateBuyerToken');


// Buyer tracking
router.post('/buyer', trackByBuyer);

// Seller tracking
router.get('/seller/:sellerId', verifyToken, isSeller, trackBySeller);

// Shipment status update
router.put('/shipment/:orderId', verifyToken, updateShipmentStatus);

// Satisfaction status update ✅ FIXED: now uses proper controller + token check
router.put('/satisfaction/:orderId', authenticateBuyerToken, updateSatisfactionStatus);

module.exports = router;
