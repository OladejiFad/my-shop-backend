const express = require('express');
const router = express.Router();
const {
  registerSeller,
  registerLandlord,
  loginUser,
  getSellerProfile,
  getLandlordProfile // ✅ You'll need this controller too
} = require('../controllers/authController');

const {
  verifyToken,
  isSeller,
  isLandlord // ✅ include this middleware
} = require('../middleware/authMiddleware');

// Registration routes
router.post('/register', registerSeller);
router.post('/register-landlord', registerLandlord); // ✅ Landlord registration

// Shared login
router.post('/login', loginUser);

// Seller profile
router.get('/profile', verifyToken, isSeller, getSellerProfile);

// ✅ Landlord profile
router.get('/landlord-profile', verifyToken, isLandlord, getLandlordProfile);

module.exports = router;
