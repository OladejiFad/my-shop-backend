// controllers/getSellerAccountAndCommission.js
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Product = require("../models/productModel"); // keep if you need it elsewhere

/**
 * GET /api/orders/:orderId/seller-commissions
 * Return each seller’s account info, commission amount, and net payment for an order.
 */
exports.getSellerAccountAndCommission = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId" });
    }

    // 2. Fetch order with product info
    const order = await Order.findById(orderId)
      .populate("cartItems.productId", "price sellerId") // only need price & seller
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 3. Aggregate totals per seller
    const sellerTotals = {}; // { sellerId: { total: number } }
    let orderTotal = 0;

    order.cartItems.forEach((item) => {
      if (!item.productId) return;

      const { sellerId, price } = item.productId;
      const subtotal = price * item.quantity;
      orderTotal += subtotal;

      const id = sellerId.toString();
      sellerTotals[id] = (sellerTotals[id] || 0) + subtotal;
    });

    // 4. Fetch seller account details
    const sellerIds = Object.keys(sellerTotals);
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("name accountNumber bankName")
      .lean();

    const sellerInfoMap = {};
    sellers.forEach((s) => {
      sellerInfoMap[s._id.toString()] = {
        id: s._id,
        name: s.name,
        accountNumber: s.accountNumber ?? "N/A",
        bankName: s.bankName ?? "N/A",
      };
    });

    // 5. Build response array
    const totalCommission = order.totalCommission ?? 0;
    const totalSellerPayment = order.totalSellerPayment ?? 0;

    const result = sellerIds.map((id) => {
      const proportion = sellerTotals[id] / orderTotal;
      return {
        seller: sellerInfoMap[id] || { id, name: "Unknown", accountNumber: "N/A", bankName: "N/A" },
        commission: (totalCommission * proportion).toFixed(2),
        sellerPayment: (totalSellerPayment * proportion).toFixed(2),
      };
    });

    res.status(200).json({ orderId: order._id, sellers: result });
  } catch (err) {
    console.error("getSellerAccountAndCommission error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
