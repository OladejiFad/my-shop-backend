const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getOrdersByBuyerPhone,
  getSellerOrders,
  getCartItemsForOrder,
  updateOrderStatus,
  getTopSellersOfMonth,
} = require('../controllers/orderController');

const validateOrderProducts = require('../middleware/validateOrderProducts');
const { isSeller, verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const { generateOrderId } = require('../utils/orderUtils');

// 📦 Buyer places order via cart
router.post('/items/:buyerPhone', async (req, res) => {
  const { name, location } = req.body;
  const buyerPhone = req.params.buyerPhone;

  console.log('📥 Incoming POST /items/:buyerPhone =>', buyerPhone, req.body);

  try {
    const cart = await Cart.findOne({ buyerPhone });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or not found.' });
    }

    const validItems = cart.items.filter(item =>
      item.productId &&
      item.productName &&
      item.price &&
      item.quantity &&
      item.sellerId
    );

    if (validItems.length === 0) {
      return res.status(400).json({ error: 'No valid items in cart to place order.' });
    }

    // ✅ Stock validation
    for (const item of validItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productName}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${item.productName}". Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }
    }

    const formattedProducts = validItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      sellerId: item.sellerId,
    }));

    const order = new Order({
      buyerPhone,
      buyerName: name,
      buyerLocation: location,
      orderId: generateOrderId(),
      products: formattedProducts,
      paymentStatus: 'Pending',
      deliveryStatus: 'Processing',
      satisfactionStatus: 'Unrated',
      colorStatus: 'Default',
      createdAt: new Date(),
    });

    await order.save();

    // ✅ Reduce stock after successful order
    for (const item of validItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    await Cart.deleteOne({ buyerPhone });

    res.status(200).json({ message: 'Order placed', orderId: order.orderId });
  } catch (err) {
    console.error('❌ Order creation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🛒 Buyer fetches items for review before placing an order
router.get('/items/:buyerPhone', (req, res, next) => {
  console.log('📥 Incoming GET /items/:buyerPhone =>', req.params.buyerPhone);
  next();
}, getCartItemsForOrder);

// 📦 Buyer views their orders
router.get('/buyer/:buyerPhone', getOrdersByBuyerPhone);

// 🧾 Seller views orders containing their products
router.get('/seller/:sellerId', verifyToken, isSeller, getSellerOrders);

// 📦 Admin or internal use: manual or bulk order placement
router.post('/place', (req, res, next) => {
  console.log('📥 Incoming POST /place =>', req.body);
  next();
}, validateOrderProducts, placeOrder);

// ✅ Update order status
router.put('/status/:orderId', updateOrderStatus);

// 🏆 Top 20 sellers of the current month (based on order quantity)
router.get('/top-sellers-of-month', getTopSellersOfMonth);

module.exports = router;
