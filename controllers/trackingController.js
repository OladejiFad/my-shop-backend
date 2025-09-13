const Order = require('../models/orderModel');
const Bargain = require('../models/bargainModel');
const jwt = require('jsonwebtoken');
const { updateStoreScore } = require('../utils/storeScoreHelper');

const secret = process.env.JWT_SECRET || 'tradysecretkey';

// 🟩 Buyer tracking controller (with token)
const trackByBuyer = async (req, res) => {
  try {
    const { buyerPhone } = req.body;
    if (!buyerPhone) {
      return res.status(400).json({ message: 'Buyer phone is required' });
    }

    const orders = await Order.find({ buyerPhone }).sort({ createdAt: -1 });
    const bargains = await Bargain.find({ buyerPhone }).sort({ createdAt: -1 });

    if (orders.length === 0 && bargains.length === 0) {
      return res.status(404).json({ message: 'No orders or bargains found for this buyer' });
    }

    const ordersJSON = orders.map(o => ({
      ...o.toObject(),
      shipmentStatus: o.deliveryStatus,
    }));

    const token = jwt.sign({ buyerPhone, type: 'buyer' }, secret, { expiresIn: '7d' });

    res.status(200).json({ orders: ordersJSON, bargains, token });
  } catch (error) {
    console.error('trackByBuyer error:', error);
    res.status(500).json({ message: 'Server error fetching tracking data' });
  }
};

// 🟨 Seller tracking controller — filters seller's products only
const trackBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!sellerId) return res.status(400).json({ message: 'Seller ID is required' });

    const orders = await Order.find({ 'products.sellerId': sellerId })
      .sort({ createdAt: -1 })
      .lean();

    const filteredOrders = orders.map(order => {
      const sellerProducts = order.products.filter(p => p.sellerId === sellerId);
      const shipmentStatus =
        ['Satisfied ❤️', 'I Like It 💛', 'Refund'].includes(order.satisfactionStatus)
          ? 'Delivered'
          : order.deliveryStatus || '';

      return {
        ...order,
        products: sellerProducts,
        shipmentStatus,
      };
    });

    res.status(200).json({ orders: filteredOrders });
  } catch (error) {
    console.error('trackBySeller error:', error);
    res.status(500).json({ message: 'Server error fetching seller tracking data' });
  }
};

// 🔵 Shipment status update controller
const updateShipmentStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.deliveryStatus = status;
    await order.save();

    res.status(200).json({
      message: 'Shipment status updated',
      order: {
        ...order.toObject(),
        shipmentStatus: order.deliveryStatus,
      },
    });
  } catch (err) {
    console.error('updateShipmentStatus error:', err);
    res.status(500).json({ message: 'Error updating shipment status', error: err.message });
  }
};

// ✅ Satisfaction status update controller (atomic + score update)
const updateSatisfactionStatus = async (req, res) => {
  const { orderId } = req.params;
  const { satisfactionStatus } = req.body;

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // ⏺️ Update satisfaction
    order.satisfactionStatus = satisfactionStatus;

    // ✅ No matter what – mark as Delivered
    order.deliveryStatus = 'Delivered';

    await order.save();

    // ⏫ Update store scores
    for (const item of order.products) {
      updateStoreScore(item.sellerId).catch(console.error);
    }

    return res.status(200).json({
      message: 'Satisfaction status updated and shipment marked Delivered',
      status: order.satisfactionStatus,
      shipmentStatus: order.deliveryStatus,
    });
  } catch (err) {
    console.error('updateSatisfactionStatus error:', err);
    return res.status(500).json({ message: 'Failed to update satisfaction status', error: err.message });
  }
};


module.exports = {
  trackByBuyer,
  trackBySeller,
  updateShipmentStatus,
  updateSatisfactionStatus,
};
