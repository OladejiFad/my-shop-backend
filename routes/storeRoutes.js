const express = require('express');
const router = express.Router();

const {
  setupOrUpdateStoreBySeller,
  adminUpdateStore,
  getStoreBySellerId,
  getStoreById,
  getPublicStoreBySellerId,
  getFilteredStores,
} = require('../controllers/storeController');

const { verifyToken, isSeller, verifyAdmin } = require('../middleware/authMiddleware');

// Seller creates or updates their store
router.post('/setup', verifyToken, isSeller, setupOrUpdateStoreBySeller);

// Admin updates store by ID
router.put('/admin/:id', verifyToken, verifyAdmin, adminUpdateStore);

// Seller fetches their store
router.get('/my-store', verifyToken, isSeller, getStoreBySellerId);

// ✅ Public: Get a single store by sellerId (used by buyer view)
router.get('/public/:sellerId', getPublicStoreBySellerId);

// ✅ Public: Filtered stores, e.g., ?type=skillworker or ?type=vendor
router.get('/filtered', getFilteredStores);

// ⚠️ Keep this at the bottom to avoid route conflicts
router.get('/:id', getStoreById);

module.exports = router; // ✅ VERY IMPORTANT
