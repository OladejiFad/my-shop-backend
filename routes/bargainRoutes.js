const express = require('express');
const router = express.Router();
const bargainController = require('../controllers/bargainController');
const { verifyToken, isSeller } = require('../middleware/authMiddleware');

// Buyer (guest) starts or continues a bargain (no authentication)
router.post('/start', bargainController.startOrContinueBargain);

// Seller responds to a bargain (accept, reject, or counter offer) — requires seller auth
router.post('/respond', verifyToken, isSeller, bargainController.respondToBargain);

// Seller fetches all bargains (requires seller auth)
router.get('/seller', verifyToken, isSeller, bargainController.getSellerBargains);

// Buyer fetches bargains (no auth since buyer is guest)
router.get('/buyer', bargainController.getBuyerBargains);

// DELETE /api/bargain/:id — delete a bargain (only seller, authorized)
router.delete('/:id', verifyToken, isSeller, bargainController.deleteBargain);

// GET /api/bargain/:id — fetch a single bargain by ID (buyerPhone required)
router.get('/:id', bargainController.getBargainById);

// Buyer responds to bargain
router.post('/buyer/respond', bargainController.buyerRespondToBargain);

// Get successful (accepted) bargains for a buyer to sync with cart/order
router.get('/successful/:buyerPhone', bargainController.getSuccessfulBargains);

// ✅ NEW: Mark bargains as used (addedToCart = true) after syncing to cart
router.post('/mark-used', bargainController.markBargainsAsUsed);

// ✅ NEW: Add accepted bargain to cart (by buyerPhone)
router.post('/:bargainId/add-to-cart', bargainController.addToCartFromBargain);

// ✅ Buyer accepts seller offer (stores acceptedPrice)
router.post('/buyer/accept', bargainController.acceptSellerOffer);



module.exports = router;
