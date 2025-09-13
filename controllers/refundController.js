// controllers/refundController.js
const RefundRequest = require('../models/refundModel');
const Order = require('../models/orderModel');  // Assuming this exists
const User = require('../models/userModel');

// Buyer requests a refund
const requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const buyerId = req.user._id;  // User is set from verifyToken middleware

    // Check if the order exists and belongs to the buyer
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (order.buyer.toString() !== buyerId.toString()) {
      return res.status(403).json({ message: 'You can only request a refund for your own orders.' });
    }

    // Create refund request
    const refundRequest = new RefundRequest({
      orderId,
      buyerId,
      reason,
    });

    await refundRequest.save();

    res.status(201).json({ message: 'Refund request submitted successfully.', refundRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// Admin handles refund request (approve/reject)
const handleRefundRequest = async (req, res) => {
  try {
    const { refundRequestId, status } = req.body;  // Status could be "approved" or "rejected"

    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admins only can handle refund requests.' });
    }

    // Update the refund request status
    const refundRequest = await RefundRequest.findById(refundRequestId);
    if (!refundRequest) {
      return res.status(404).json({ message: 'Refund request not found.' });
    }

    refundRequest.status = status;
    await refundRequest.save();

    res.status(200).json({ message: 'Refund request handled successfully.', refundRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

module.exports = { requestRefund, handleRefundRequest };
