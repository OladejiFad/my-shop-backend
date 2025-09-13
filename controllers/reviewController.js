// controllers/reviewController.js
const Review = require('../models/reviewModel');
const Product = require('../models/productModel'); // For updating average rating

// Add a review (public)
exports.addReview = async (req, res) => {
  const {
    targetId,
    targetType,
    rating,
    message,
    buyerPhone = 'anonymous',
    buyerName = 'Anonymous',
  } = req.body;

  if (!targetId || !targetType || !rating || !message) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  try {
    // Prevent duplicate anonymous reviews by phone (if provided)
    const exists = await Review.findOne({ targetId, targetType, buyerPhone });
    if (exists && buyerPhone !== 'anonymous') {
      return res.status(400).json({ message: 'You already reviewed this item' });
    }

    const review = new Review({
      targetId,
      targetType,
      buyerPhone,
      buyerName,
      rating,
      message,
    });

    await review.save();

    // If it's a product review, update the average rating
    if (targetType === 'product') {
      const reviews = await Review.find({ targetId, targetType });
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await Product.findByIdAndUpdate(targetId, {
        averageRating: avg.toFixed(1),
      });
    }

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (err) {
    console.error('Error adding review:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews for a product
exports.getReviews = async (req, res) => {
  const { targetId } = req.params;

  try {
    const reviews = await Review.find({ targetId, targetType: 'product' }).select('-buyerPhone');
    res.status(200).json({ reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
