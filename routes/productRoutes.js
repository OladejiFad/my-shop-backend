const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  verifyToken,
  isSeller,
  isSellerOrAdmin,
} = require('../middleware/authMiddleware');
const {
  createProduct,
  getAllProducts,
  getProductById,
  getProductsBySellerId,
  updateProduct,
  deleteProduct,
  getSellerProducts,
} = require('../controllers/productController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Seller's own products route - MUST be before '/:id' route
router.get('/seller', verifyToken, isSeller, getSellerProducts);

// Public routes
router.get('/', getAllProducts);
router.get('/seller/:sellerId', getProductsBySellerId);
router.get('/:id', getProductById);

// Protected routes
router.post('/', verifyToken, isSeller, upload.array('images', 5), createProduct);
router.put('/:id', verifyToken, isSeller, upload.array('images', 5), updateProduct);
router.delete('/:id', verifyToken, isSellerOrAdmin, deleteProduct);

module.exports = router;
