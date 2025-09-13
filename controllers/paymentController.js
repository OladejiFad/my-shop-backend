const axios = require('axios');
const Order = require('../models/orderModel');
const User = require('../models/userModel');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Initialize a transaction
exports.initializePayment = async (req, res) => {
  const { email, orderId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const amountInKobo = order.totalAmount * 100;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInKobo,
        reference: `order_${orderId}_${Date.now()}`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    order.paystackReference = response.data.data.reference;
    await order.save();

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
};

// Verify transaction manually by reference
exports.verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

// Paystack webhook to verify payment asynchronously and update order/seller earnings
exports.verifyWebhook = async (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    try {
      const order = await Order.findOne({ paystackReference: reference }).populate('cartItems.productId');
      if (!order) return res.status(404).send('Order not found');

      // Update order payment and status
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.paymentAmount = event.data.amount / 100;
      await order.save();

      // Calculate total price of order for proportional calculations
      let totalProductAmount = 0;
      const sellerMap = new Map();

      for (const item of order.cartItems) {
        const product = item.productId;
        if (!product) continue;

        const sellerId = product.sellerId.toString();
        const itemTotal = item.price * item.quantity;
        totalProductAmount += itemTotal;

        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, 0);
        }
        sellerMap.set(sellerId, sellerMap.get(sellerId) + itemTotal);
      }

      // Update each seller's commission and payment share
      for (const [sellerId, amountSold] of sellerMap.entries()) {
        const seller = await User.findById(sellerId);
        if (!seller) continue;

        const commission = order.totalCommission * (amountSold / totalProductAmount);
        const sellerPayment = order.totalSellerPayment * (amountSold / totalProductAmount);

        seller.pendingCommission = (seller.pendingCommission || 0) + commission;
        seller.pendingPayments = (seller.pendingPayments || 0) + sellerPayment;
        await seller.save();
      }

      res.status(200).send('Payment verified and order + seller earnings updated');
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).send('Server error');
    }
  } else {
    res.status(200).send('Event ignored');
  }
};
