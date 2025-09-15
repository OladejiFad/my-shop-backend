const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const Complaint = require('../models/complaintModel');
const Feedback = require('../models/feedbackModel');
const Reminder = require('../models/reminderModel');
const Order = require('../models/orderModel');
const Bargain = require('../models/bargainModel');

// Register Admin
exports.registerAdmin = async (req, res) => {
  let { username, phone, password } = req.body;

  try {
    if (!username || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    username = username.trim();
    phone = phone.trim();

    const nigeriaPhoneRegex = /^(?:\+234|0)(70|80|81|90|91)\d{8}$/;
    if (!nigeriaPhoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid Nigerian phone number format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // 🚨 no hashing here, let schema do it
    const newAdmin = new Admin({ username, phone, password });
    await newAdmin.save();

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Login Admin
exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Seller Management
exports.getPendingSellers = async (req, res) => {
  try {
    const pendingSellers = await User.find({ role: 'seller', approved: false });
    res.status(200).json(pendingSellers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending sellers', error: error.message });
  }
};

exports.approveSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await User.findOne({ _id: sellerId, role: 'seller' });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (seller.approved) return res.status(400).json({ message: 'Already approved' });

    seller.approved = true;
    await seller.save();
    res.status(200).json({ message: 'Seller approved successfully', seller });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve seller', error: error.message });
  }
};

exports.approveAllPendingSellers = async (req, res) => {
  try {
    const result = await User.updateMany(
      { role: 'seller', approved: false },
      { $set: { approved: true } }
    );
    res.status(200).json({ message: `${result.modifiedCount} sellers approved.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve sellers', error: error.message });
  }
};

exports.rejectSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await User.findOneAndDelete({ _id: sellerId, role: 'seller', approved: false });

    if (!seller) return res.status(404).json({ message: 'Seller not found or already approved' });
    res.status(200).json({ message: 'Seller rejected and deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject seller', error: error.message });
  }
};

// ✅ Ban Seller
exports.banSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    console.log(`🔍 Ban request received for sellerId: ${sellerId}`);

    const seller = await User.findOne({ _id: sellerId, role: 'seller' });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    await User.updateOne({ _id: sellerId }, { banned: true });
    res.status(200).json({ message: 'Seller banned successfully' });
  } catch (error) {
    console.error(`❌ Error banning seller: ${error.message}`);
    res.status(500).json({ message: 'Error banning seller', error: error.message });
  }
};

exports.unbanSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    console.log(`🔍 Unban request received for sellerId: ${sellerId}`);

    const seller = await User.findOne({ _id: sellerId, role: 'seller' });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (!seller.banned) return res.status(400).json({ message: 'Seller is not banned' });

    await User.updateOne({ _id: sellerId }, { banned: false });
    res.status(200).json({ message: 'Seller unbanned successfully' });
  } catch (error) {
    console.error(`❌ Error unbanning seller: ${error.message}`);
    res.status(500).json({ message: 'Failed to unban seller', error: error.message });
  }
};


exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' });
    res.status(200).json(sellers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sellers', error: error.message });
  }
};


// Stats
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalApprovedSellers = await User.countDocuments({ role: 'seller', approved: true });
    const totalBannedSellers = await User.countDocuments({ role: 'seller', banned: true });

    res.status(200).json({
      totalUsers,
      totalSellers,
      totalApprovedSellers,
      totalBannedSellers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

// Complaints
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};

exports.resolveComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.resolved = true;
    await complaint.save();
    res.status(200).json({ message: 'Complaint resolved', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving complaint', error: error.message });
  }
};

// Feedback
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch feedbacks', error: error.message });
  }
};

// Reminders
exports.getAllReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find().sort({ createdAt: -1 });
    res.status(200).json({ reminders }); // ✅ wrap in object
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reminders', error: error.message });
  }
};


exports.createReminder = async (req, res) => {
  try {
    const { message, scheduledAt } = req.body;

    if (!message || !scheduledAt) {
      return res.status(400).json({ message: 'Message and scheduledAt (date and time) are required' });
    }

    const remindDate = new Date(scheduledAt);
    if (isNaN(remindDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date/time format for scheduledAt' });
    }

    const reminder = new Reminder({
      message,
      remindAt: remindDate,
    });

    await reminder.save();

    res.status(201).json({ message: 'Reminder created', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create reminder', error: error.message });
  }
};



exports.updateReminder = async (req, res) => {
  try {
    const { message, remindAt } = req.body;

    if (remindAt) {
      const remindDate = new Date(remindAt);
      if (isNaN(remindDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date/time format for remindAt' });
      }
      req.body.remindAt = remindDate;  // ensure it's saved as Date
    }

    const updated = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Reminder not found' });
    res.status(200).json({ message: 'Reminder updated', updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update reminder', error: error.message });
  }
};


exports.deleteReminder = async (req, res) => {
  try {
    const deleted = await Reminder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Reminder not found' });
    res.status(200).json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete reminder', error: error.message });
  }
};

// Seller Commission Info
exports.getSellerAccountAndCommission = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('seller');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const seller = order.seller;
    res.status(200).json({
      sellerId: seller._id,
      pendingCommission: seller.pendingCommission || 0,
      pendingPayments: seller.pendingPayments || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve seller info', error: error.message });
  }
};

// ✅ Get All Orders
// 🟩 Buyer tracking controller
exports.trackByBuyer = async (req, res) => {
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
      shipmentStatus: o.deliveryStatus, // alias for frontend consistency
    }));

    res.status(200).json({ orders: ordersJSON, bargains });
  } catch (error) {
    console.error('trackByBuyer error:', error);
    res.status(500).json({ message: 'Server error fetching tracking data' });
  }
};

// 🟨 Seller tracking controller
exports.trackBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!sellerId) return res.status(400).json({ message: 'Seller ID is required' });

    const orders = await Order.find({ 'products.sellerId': sellerId }).sort({ createdAt: -1 });

    const ordersJSON = orders.map(o => ({
      ...o.toObject(),
      shipmentStatus: o.deliveryStatus,
    }));

    res.status(200).json({ orders: ordersJSON });
  } catch (error) {
    console.error('trackBySeller error:', error);
    res.status(500).json({ message: 'Server error fetching seller tracking data' });
  }
};

// 🟦 Admin tracking controller (replaces getAllOrders)
exports.trackAllOrdersForAdmin = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    const bargains = await Bargain.find().sort({ createdAt: -1 });

    const ordersJSON = orders.map(o => ({
      ...o.toObject(),
      shipmentStatus: o.deliveryStatus,
    }));

    res.status(200).json({ orders: ordersJSON, bargains });
  } catch (error) {
    console.error('trackAllOrdersForAdmin error:', error);
    res.status(500).json({ message: 'Server error fetching admin tracking data' });
  }
};

// ✅ Update Delivery Status
exports.updateDeliveryStatus = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.deliveryStatus = 'Out for Delivery';
    await order.save();

    res.status(200).json({ message: 'Order marked as out for delivery' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};


// ✅ Admin updates satisfaction status
exports.updateSatisfactionStatus = async (req, res) => {
  const { orderId } = req.params;
  const { satisfactionStatus } = req.body;

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.satisfactionStatus = satisfactionStatus;
    await order.save();

    res.status(200).json({ message: 'Satisfaction status updated', status: satisfactionStatus });
  } catch (err) {
    console.error('updateSatisfactionStatus error:', err);
    res.status(500).json({ message: 'Failed to update satisfaction status', error: err.message });
  }
};

// ✅ Manual payment and order status update
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus, orderStatus } = req.body;

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (orderStatus) order.orderStatus = orderStatus;

    await order.save();
    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

// Get Pending Landlords (approved: false, role: 'landlord')
exports.getPendingLandlords = async (req, res) => {
  try {
    const landlords = await User.find({ role: 'landlord', approved: false });
    res.status(200).json(landlords);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch landlords', error: err.message });
  }
};

// Approve or Reject Landlord
exports.approveOrRejectLandlord = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // boolean

    const landlord = await User.findById(id);
    if (!landlord || landlord.role !== 'landlord') {
      return res.status(404).json({ message: 'Landlord not found' });
    }

    if (approve) {
      landlord.approved = true;
      await landlord.save();
      return res.status(200).json({ message: 'Landlord approved' });
    } else {
      await landlord.remove();
      return res.status(200).json({ message: 'Landlord rejected and deleted' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to update landlord', error: err.message });
  }
};

// Ban landlord
exports.banLandlord = async (req, res) => {
  try {
    const { landlordId } = req.params;
    const landlord = await User.findOne({ _id: landlordId, role: 'landlord' });
    if (!landlord) return res.status(404).json({ message: 'Landlord not found' });

    landlord.banned = true;
    await landlord.save();

    res.status(200).json({ message: 'Landlord banned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error banning landlord', error: error.message });
  }
};

// Unban landlord
exports.unbanLandlord = async (req, res) => {
  try {
    const { landlordId } = req.params;
    const landlord = await User.findOne({ _id: landlordId, role: 'landlord' });
    if (!landlord) return res.status(404).json({ message: 'Landlord not found' });

    landlord.banned = false;
    await landlord.save();

    res.status(200).json({ message: 'Landlord unbanned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unbanning landlord', error: error.message });
  }
};
exports.getAllApprovedLandlords = async (req, res) => {
  try {
    const landlords = await User.find({
      role: 'landlord',
      isApproved: true,
      banned: false,
    });
    res.json(landlords);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching landlords', error: err.message });
  }
};







