const User = require('../models/userModel');
const Product = require('../models/productModel');

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  const userId = req.userId;
  const { productId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ message: 'Product added to wishlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  const userId = req.userId;
  const { productId } = req.params;

  try {
    const user = await User.findById(userId);
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove from wishlist' });
  }
};

// Get wishlist
exports.getWishlist = async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId).populate('wishlist');
    res.status(200).json(user.wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};
