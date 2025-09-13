const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Get all cart items for a buyer
router.get('/:buyerPhone', cartController.getCart);

// Add or update a single cart item
router.post('/add', cartController.addOrUpdateCartItem);

// Remove a single cart item by buyer phone and product ID
router.delete('/remove/:buyerPhone/:productId', cartController.removeCartItem);

// Clear entire cart (optional: restrict to a buyerPhone if needed)
router.delete('/clear', cartController.clearCart);

// ✅ Sync the full cart from the client (for guests or post-login merge)
router.post('/sync/:buyerPhone', cartController.syncCart);  // 🔥 newly added

module.exports = router;
