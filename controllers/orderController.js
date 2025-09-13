const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Bargain = require('../models/bargainModel');
const GroupBuy = require('../models/groupBuyModel');
const Cart = require('../models/cartModel');
const Store = require('../models/storeModel');

const { generateOrderId } = require('../utils/orderUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'yourSuperSecretKey';

const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { buyerName, buyerPhone, location, products: clientProducts = [] } = req.body;
    buyerPhone = normalizePhone(buyerPhone); // 🔧 Normalize before saving

    console.log('📦 Incoming order payload:', req.body);

    if (!buyerName || !buyerPhone || !location) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Please provide buyer info.' });
    }

    const acceptedBargains = await Bargain.find({
      buyerPhone,
      status: 'accepted',
      addedToCart: true,
    }).session(session);

    const bargainItems = [];

    for (const b of acceptedBargains) {
      const product = await Product.findById(b.productId).session(session);
      if (!product) continue;

      bargainItems.push({
        productId: b.productId,
        sellerId: b.sellerId,
        quantity: b.quantity,
        price: b.acceptedPrice,
        productName: product.name || 'Unnamed',
        isBargain: true,
        bargainId: b._id,
      });
    }

    const groupBuyDeals = await GroupBuy.find({
      'paidParticipants.phone': buyerPhone,
      'paidParticipants.used': true,
      'paidParticipants.ordered': false,
    }).session(session);

    const groupBuyItems = [];
    for (const gb of groupBuyDeals) {
      const participant = gb.paidParticipants.find(p => p.phone === buyerPhone && p.used && !p.ordered);
      if (!participant) continue;

      const product = await Product.findById(gb.productId).session(session);
      if (!product) continue;

      groupBuyItems.push({
        productId: gb.productId,
        sellerId: gb.sellerId,
        quantity: participant.quantity,
        price: gb.pricePerUnit,
        productName: product.name || 'Unnamed',
        isGroupBuy: true,
        groupBuyId: gb._id,
      });
    }

    const allProducts = [...clientProducts, ...bargainItems, ...groupBuyItems];

    if (allProducts.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'No products to order.' });
    }

    for (const p of allProducts) {
      if (!p.productId || !p.sellerId || typeof p.quantity !== 'number' || typeof p.price !== 'number') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Each product must have productId, sellerId, quantity (number), and price (number).' });
      }

      const product = await Product.findById(p.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Product ${p.productId} not found.` });
      }

      if (product.stock < p.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Not enough stock for product ${product.name}` });
      }

      product.stock -= p.quantity;
      product.sold += p.quantity;
      await product.save({ session });
    }

    const orderId = generateOrderId();

    const newOrder = new Order({
      orderId,
      buyerName,
      buyerPhone,
      buyerLocation: location,
      deliveryStatus: 'Processing',          // ✅ Optional, but good to include
      satisfactionStatus: 'Unrated',         // ✅ Optional default
      paymentStatus: 'success',              // ✅ You may change based on real flow
      orderStatus: 'Success',                // ✅ <<<<<< THIS IS THE MAIN FIX
      products: allProducts.map(p => ({
        productId: p.productId,
        sellerId: p.sellerId,
        quantity: p.quantity,
        price: p.price,
        productName: p.productName || 'Unnamed',
        isBargain: p.isBargain || false,
        isGroupBuy: p.isGroupBuy || false,
      })),
    });


    await newOrder.save({ session });

    await Cart.deleteMany({ buyerPhone }).session(session);

    const usedBargainIds = bargainItems.map(p => p.bargainId);
    if (usedBargainIds.length > 0) {
      await Bargain.updateMany(
        { _id: { $in: usedBargainIds } },
        { $set: { status: 'completed', orderId } }
      ).session(session);
    }

    for (const gb of groupBuyItems) {
      await GroupBuy.updateMany(
        { _id: gb.groupBuyId, 'paidParticipants.phone': buyerPhone },
        { $set: { 'paidParticipants.$[elem].ordered': true } },
        { arrayFilters: [{ 'elem.phone': buyerPhone }] }
      ).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    const token = jwt.sign({ buyerPhone, type: 'buyer' }, JWT_SECRET, { expiresIn: '7d' });

    console.log('✅ Order placed successfully with ID:', orderId);
    res.status(201).json({ message: 'Order placed successfully', orderId, token });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ placeOrder error:', error);
    res.status(500).json({ message: 'Server error placing order' });
  }
};

const normalizePhone = (phone) => {
  // Convert +234816... → 0816...
  if (phone.startsWith('+234')) {
    return '0' + phone.slice(4);
  }
  return phone;
};

const getOrdersByBuyerPhone = async (req, res) => {
  try {
    let { buyerPhone } = req.params;

    if (!buyerPhone) {
      return res.status(400).json({ message: 'Buyer phone is required' });
    }

    const normalizedPhone = normalizePhone(buyerPhone);

    const orders = await Order.find({ buyerPhone: normalizedPhone }).sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('getOrdersByBuyerPhone error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};



const getSellerOrders = async (req, res) => {
  const { sellerId } = req.params;
  try {
    const orders = await Order.find({ 'products.sellerId': sellerId }).lean();

    const filteredOrders = orders.map(order => {
      const filteredProducts = (order.products || []).filter(p =>
        p && typeof p === 'object' && p.productId && p.sellerId
      );

      return {
        ...order,
        products: filteredProducts,
      };
    });

    res.json({ orders: filteredOrders });
  } catch (error) {
    console.error('❌ getSellerOrders error:', error);
    res.status(500).json({ message: 'Failed to fetch seller orders' });
  }
};


const getCartItemsForOrder = async (req, res) => {
  try {
    const phone = req.params.buyerPhone;
    console.log("📥 Fetching items for phone:", phone);

    if (!phone) {
      return res.status(400).json({ message: 'Buyer phone is required' });
    }

    const bargains = await Bargain.find({
      buyerPhone: phone,
      status: 'accepted',
      addedToCart: true,
    });

    const bargainItems = [];
    for (const b of bargains) {
      if (b.productId && b.sellerId && b.quantity && b.acceptedPrice) {
        const product = await Product.findById(b.productId).lean();
        if (!product) continue;
        bargainItems.push({
          productId: b.productId,
          sellerId: b.sellerId,
          quantity: b.quantity,
          price: b.acceptedPrice,
          source: 'bargain',
          isBargain: true,
          productName: product.name || 'Unnamed',
        });
      }
    }

    const groupBuys = await GroupBuy.find({
      'paidParticipants.phone': phone,
      'paidParticipants.used': true,
      'paidParticipants.ordered': false,
    });

    const groupBuyItems = [];
    for (const gb of groupBuys) {
      const participant = gb.paidParticipants.find(p => p.phone === phone && p.used && !p.ordered);
      if (!participant) continue;

      const product = await Product.findById(gb.productId).lean();
      if (!product) continue;

      groupBuyItems.push({
        productId: gb.productId,
        sellerId: gb.sellerId,
        quantity: participant.quantity,
        price: gb.pricePerUnit,
        source: 'groupBuy',
        isGroupBuy: true,
        productName: product.name || 'Unnamed',
      });
    }

    const cartData = await Cart.findOne({ buyerPhone: phone });
    const normalItems = [];

    for (const c of (cartData?.items || [])) {
      if (c.productId && c.sellerId && c.quantity && c.price) {
        const product = await Product.findById(c.productId).lean();
        if (!product) continue;
        normalItems.push({
          productId: c.productId,
          sellerId: c.sellerId,
          quantity: c.quantity,
          price: c.price,
          source: 'cart',
          isBargain: false,
          productName: product.name || 'Unnamed',
        });
      }
    }

    const combined = [...bargainItems, ...groupBuyItems, ...normalItems];

    console.log("🛒 Combined items to send:", combined);
    return res.status(200).json({ items: combined });
  } catch (err) {
    console.error('❌ getCartItemsForOrder error:', err);
    res.status(500).json({ message: 'Server error fetching cart items' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('❌ getAllOrders error:', error);
    res.status(500).json({ message: 'Server error fetching all orders' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { deliveryStatus, satisfactionStatus, paymentStatus } = req.body;

  try {
    const updateFields = {};
    if (deliveryStatus) updateFields.deliveryStatus = deliveryStatus;
    if (satisfactionStatus) updateFields.satisfactionStatus = satisfactionStatus;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;

    const updated = await Order.findOneAndUpdate(
      { orderId },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ message: 'Order status updated', order: updated });
  } catch (err) {
    console.error('❌ updateOrderStatus error:', err);
    res.status(500).json({ message: 'Server error updating order' });
  }
};



const getTopSellersOfMonth = async (req, res) => {
  try {
    // 1. Get start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 2. Aggregate total orders per seller for the month
    const topSellers = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.sellerId',
          totalSales: { $sum: '$products.quantity' },
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 20 },
    ]);

    const topSellerIds = topSellers.map(s => s._id);

    // 3. Reset previous top sellers
    await Store.updateMany({ isTopSeller: true }, { isTopSeller: false });

    // 4. Tag current top sellers
    await Store.updateMany(
      { sellerId: { $in: topSellerIds } },
      { $set: { isTopSeller: true } }
    );

    // 5. Fetch updated stores (optional)
    const topStores = await Store.find({ sellerId: { $in: topSellerIds } });

    res.json({ topStores });
  } catch (err) {
    console.error('Error getting top sellers:', err);
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
};


module.exports = {
  placeOrder,
  getOrdersByBuyerPhone,
  getSellerOrders,
  getCartItemsForOrder,
  getAllOrders,
  updateOrderStatus,
  getTopSellersOfMonth,
};
