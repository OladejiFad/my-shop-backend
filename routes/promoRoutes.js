const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const promoController = require('../controllers/promoController');

// Create a promo (seller only)
router.post('/', verifyToken, promoController.createPromo);

// Get promos created by logged-in seller
router.get('/seller', verifyToken, promoController.getSellerPromos);

// Public: Get promos by seller ID (for buyers)
router.get('/seller/:id', promoController.getPromosBySellerId);

// Delete a promo by id (only by owner seller)
router.delete('/:id', verifyToken, promoController.deletePromo);

// Public: Validate promo code
router.post('/validate', promoController.validatePromo);

module.exports = router;
