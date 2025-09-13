const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Product = require('../models/productModel');
const Review = require('../models/reviewModel');

// Helper to check if current time is within Market Day for sellers
const isMarketDayActiveForSeller = () => {
  const now = moment().tz('Africa/Lagos');
  const isSunday = now.day() === 0;
  const currentTime = now.format('HH:mm');

  return isSunday && currentTime >= '13:00' && currentTime <= '23:30';
};


// Create a product (seller only)
const createProduct = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      name,
      description,
      category,
      price,
      stock,
      isBargainable,
      marketSection,
      sizes,
      colors,
      discount,
    } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];

    // Validate marketSection & enforce Market Day time
    if (marketSection) {
      if (!['used', 'general'].includes(marketSection)) {
        return res.status(400).json({ message: 'Invalid market section. Choose "used" or "general".' });
      }
      if (!isMarketDayActiveForSeller()) {
        return res.status(403).json({ message: 'Market Day is not active for sellers right now. It runs Sundays from 1pm to 11:30pm.' });
      }
    }

    // Ensure sizes and colors are arrays (parse JSON if needed)
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes || [];
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors || [];

    const newProduct = new Product({
      seller: new mongoose.Types.ObjectId(sellerId), // 🔥 FIXED!
      name,
      description,
      category,
      price,
      stock,
      images,
      marketSection: marketSection || null,
      isBargainable: isBargainable !== undefined ? isBargainable : true,
      sizes: parsedSizes,
      colors: parsedColors,
      discount: discount || 0,
    });


    await newProduct.save();

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const imagesWithUrls = newProduct.images.map(imgPath =>
      baseUrl + imgPath.replace(/\\/g, '/')
    );

    res.status(201).json({
      ...newProduct.toObject(),
      sellerId,
      images: imagesWithUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to update this product' });
    }

    const {
      name,
      description,
      category,
      price,
      stock,
      isBargainable,
      marketSection,
      sizes,
      colors,
    } = req.body;

    if (marketSection) {
      if (!['used', 'general'].includes(marketSection)) {
        return res.status(400).json({ message: 'Invalid market section. Choose "used" or "general".' });
      }
      if (!isMarketDayActiveForSeller()) {
        return res.status(403).json({ message: 'Market Day is not active for sellers right now. It runs Sundays from 1pm to 11:30pm.' });
      }
      product.marketSection = marketSection;
    } else {
      product.marketSection = null;
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (isBargainable !== undefined) product.isBargainable = isBargainable;

    // Parse sizes/colors arrays if sent as strings
    if (sizes !== undefined) {
      product.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    }
    if (colors !== undefined) {
      product.colors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      product.images.push(...newImages);
    }

    await product.save();

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const imagesWithUrls = product.images.map(imgPath =>
      baseUrl + imgPath.replace(/\\/g, '/')
    );

    res.json({
      ...product.toObject(),
      sellerId: product.seller?._id?.toString() || product.seller.toString(),
      images: imagesWithUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all products with filters

const getAllProducts = async (req, res) => {
  try {
    const { category, search, page = '1', limit = '10', sort, featured } = req.query;
    const query = {};

    if (category && category.toLowerCase() !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (featured === 'true') {
      query.featured = true;
    }

    let productsQuery = Product.find(query).populate('seller', '_id');

    if (sort === 'price_asc') {
      productsQuery = productsQuery.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      productsQuery = productsQuery.sort({ price: -1 });
    } else {
      productsQuery = productsQuery.sort({ createdAt: -1 });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    productsQuery = productsQuery.skip(skip).limit(limitNum);

    const products = await productsQuery;

    const baseUrl = `${req.protocol}://${req.get('host')}/`;

    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        const imagesWithUrls = product.images.map(imgPath =>
          baseUrl + imgPath.replace(/\\/g, '/')
        );

        const latestReview = await Review.findOne({
          targetId: product._id,
          targetType: 'product'
        })
          .sort({ createdAt: -1 })
          .select('rating message createdAt');

        return {
          ...product.toObject(),
          stock: product.stock,
          sellerId: product.seller?._id?.toString() || product.seller.toString(),
          images: imagesWithUrls,
          ratingsAverage: product.ratingsAverage || 0,
          review: latestReview // ← ✅ FIXED NAME here
            ? {
              rating: latestReview.rating,
              message: latestReview.message,
              createdAt: latestReview.createdAt
            }
            : null,
        };

      })
    );

    res.status(200).json(productsWithRatings);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};


// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller', '_id name role');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const imagesWithUrls = product.images.map(imgPath =>
      baseUrl + imgPath.replace(/\\/g, '/')
    );

    res.json({
      ...product.toObject(),
      sellerId: product.seller?._id?.toString() || product.seller.toString(),
      images: imagesWithUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this product' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get products for logged-in seller
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const products = await Product.find({ seller: sellerId }).populate('seller', '_id');

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const productsWithFullImageUrls = products.map(product => {
      const imagesWithUrls = product.images.map(imgPath =>
        baseUrl + imgPath.replace(/\\/g, '/')
      );

      return {
        ...product.toObject(),
        sellerId: product.seller?._id?.toString() || product.seller.toString(),
        images: imagesWithUrls,
      };
    });

    res.json(productsWithFullImageUrls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getProductsBySellerId = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    // ✅ Validate and convert sellerId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: 'Invalid seller ID format' });
    }

    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const limit = parseInt(req.query.limit) || 0; // 👈 NEW: Get ?limit

    // ✅ Fetch limited recent products
    const products = await Product.find({ seller: sellerObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('seller', '_id');

    const baseUrl = `${req.protocol}://${req.get('host')}/`;

    const productsWithUrls = products.map((product) => {
      const imagesWithUrls = product.images.map((imgPath) =>
        baseUrl + imgPath.replace(/\\/g, '/')
      );

      return {
        ...product.toObject(),
        sellerId: product.seller?._id?.toString() || product.seller.toString(),
        images: imagesWithUrls,
      };
    });

    res.status(200).json(productsWithUrls);
  } catch (err) {
    console.error('[❌ Error fetching seller products]', err);
    res.status(500).json({
      message: 'Error fetching seller products',
      error: err.message,
    });
  }
};





module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  getSellerProducts,
  getProductsBySellerId,
  updateProduct,
  deleteProduct,
};
