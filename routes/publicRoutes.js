// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');

// Public endpoint to fetch products for visitors (no auth)
router.get('/products', async (req, res) => {
  try {
    const { query, minPrice, maxPrice, category } = req.query;

    let filter = { status: 'active', approved: true }; // Show only active + approved products

    if (query) filter.name = { $regex: query, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (category) filter.category = category;

    const products = await Product.find(filter).limit(20).sort({ createdAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching public products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', {
      status: 'active',
      approved: true,
    });
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
