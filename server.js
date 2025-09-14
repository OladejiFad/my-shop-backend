const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const { init, getIO } = require('./socket'); // <-- socket.io init + getter

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Safe route loader
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.error(`Failed to load route: ${path}\n`, err.message);
    const express = require('express');
    const router = express.Router();
    router.use((req, res) => {
      res.status(500).json({
        error: 'Route failed to load',
        path,
        message: err.message,
      });
    });
    return router;
  }
}

// Routes registration
app.use('/api/admin', safeRequire('./routes/adminRoutes'));
app.use('/api/auth', safeRequire('./routes/authRoutes'));
app.use('/api/payment', safeRequire('./routes/paymentRoutes'));
app.use('/api/reviews', safeRequire('./routes/reviewRoutes'));
app.use('/api/products', safeRequire('./routes/productRoutes'));
app.use('/api/wishlist', safeRequire('./routes/wishlistRoutes'));
app.use('/api/promo', safeRequire('./routes/promoRoutes'));
app.use('/api/public', safeRequire('./routes/publicRoutes'));
app.use('/api/bargain', safeRequire('./routes/bargainRoutes'));
app.use('/api/seller-commissions', safeRequire('./routes/sellerCommissionRoutes'));
app.use('/api/seller/store', safeRequire('./routes/storeRoutes'));
app.use('/api/feedbacks', safeRequire('./routes/feedbackRoutes'));
app.use('/api/orders', safeRequire('./routes/orderRoutes'));
app.use('/api/tracking', safeRequire('./routes/trackingRoutes'));
app.use('/api/cart', safeRequire('./routes/cartRoutes'));
app.use('/api/complaints', safeRequire('./routes/complaintRoutes'));
app.use('/api/admin/properties', safeRequire('./routes/propertyRoutes'));
app.use('/api/properties', safeRequire('./routes/propertyRoutes'));
app.use('/api/jobs', safeRequire('./routes/jobRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/transactions', safeRequire('./routes/transactionRoutes'));
app.use('/api/groupbuys', safeRequire('./routes/groupBuyRoutes'));
app.use('/api', safeRequire('./routes/marketRoutes'));
app.use('/api', safeRequire('./routes/topSellersRoutes'));

// Initialize socket.io
init(server);
app.set('io', getIO());

// Global error handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// --- Wrapped startup in try/catch ---
(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in .env');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing in .env');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1); // Exit so Railway knows deployment failed
  }
})();
