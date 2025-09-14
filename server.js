const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const { init, getIO } = require('./socket'); // socket.io init + getter

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Use morgan only in non-production
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

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

// --- Routes ---
const routes = [
  ['admin', './routes/adminRoutes'],
  ['auth', './routes/authRoutes'],
  ['payment', './routes/paymentRoutes'],
  ['reviews', './routes/reviewRoutes'],
  ['products', './routes/productRoutes'],
  ['wishlist', './routes/wishlistRoutes'],
  ['promo', './routes/promoRoutes'],
  ['public', './routes/publicRoutes'],
  ['bargain', './routes/bargainRoutes'],
  ['seller-commissions', './routes/sellerCommissionRoutes'],
  ['seller/store', './routes/storeRoutes'],
  ['feedbacks', './routes/feedbackRoutes'],
  ['orders', './routes/orderRoutes'],
  ['tracking', './routes/trackingRoutes'],
  ['cart', './routes/cartRoutes'],
  ['complaints', './routes/complaintRoutes'],
  ['admin/properties', './routes/propertyRoutes'],
  ['properties', './routes/propertyRoutes'],
  ['jobs', './routes/jobRoutes'],
  ['messages', './routes/messageRoutes'],
  ['transactions', './routes/transactionRoutes'],
  ['groupbuys', './routes/groupBuyRoutes'],
  ['', './routes/marketRoutes'],
  ['', './routes/topSellersRoutes']
];

routes.forEach(([prefix, path]) => {
  const routePath = prefix ? `/api/${prefix}` : '/api';
  app.use(routePath, safeRequire(path));
});

// Initialize socket.io
init(server);
app.set('io', getIO());

// Global error handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error('Unhandled error in request:', err);
    return res.status(500).json({ error: err.message });
  }
  next();
});

// --- Startup ---
(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in .env');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing in .env');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

// Graceful shutdown for Railway SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed gracefully');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
