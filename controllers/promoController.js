// controllers/promoController.js
const Promo = require('../models/promoModel');

// Create a promo (seller only)
exports.createPromo = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { code, discountType, discountValue, expiresAt } = req.body;

    // Check if code already exists for this seller (optional)
    const existingPromo = await Promo.findOne({ code: code.toUpperCase(), seller: sellerId });
    if (existingPromo) {
      return res.status(400).json({ message: 'Promo code already exists' });
    }

    const promo = new Promo({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      expiresAt,
      seller: sellerId,
    });

    await promo.save();
    res.status(201).json({ message: 'Promo code created successfully', promo });
  } catch (err) {
    console.error('Promo creation error:', err);
    res.status(500).json({ message: 'Failed to create promo code' });
  }
};

// Get promos created by logged-in seller
exports.getSellerPromos = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const promos = await Promo.find({ seller: sellerId });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch promos' });
  }
};

// Delete a promo by id (only by owner seller)
exports.deletePromo = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const promo = await Promo.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promo not found' });

    if (promo.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await promo.remove();
    res.json({ message: 'Promo deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Public: Validate promo code
exports.validatePromo = async (req, res) => {
  try {
    const { code } = req.body;

    const promo = await Promo.findOne({ code: code.toUpperCase(), isActive: true });

    if (!promo || (promo.expiresAt && promo.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Invalid or expired promo code' });
    }

    res.status(200).json({
      valid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    });
  } catch (err) {
    console.error('Promo validation error:', err);
    res.status(500).json({ message: 'Error validating promo code' });
  }
};

exports.getPromosBySellerId = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const promos = await Promo.find({ seller: sellerId, isActive: true });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch promos by seller' });
  }
};



