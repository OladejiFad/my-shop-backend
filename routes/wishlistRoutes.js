const express = require('express');
const router = express.Router();
const { verifyToken, verifyBuyer } = require('../middleware/authMiddleware');
const User = require('../models/userModel');

// Add to Wishlist
router.post('/add/:productId', verifyToken, verifyBuyer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const productId = req.params.productId;

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ message: 'Product added to wishlist', wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: 'Error adding to wishlist' });
  }
});

// Remove from Wishlist
router.delete('/remove/:productId', verifyToken, verifyBuyer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const productId = req.params.productId;

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.status(200).json({ message: 'Product removed from wishlist', wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: 'Error removing from wishlist' });
  }
});

// Get Wishlist
router.get('/', verifyToken, verifyBuyer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.status(200).json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching wishlist' });
  }
});

module.exports = router;
