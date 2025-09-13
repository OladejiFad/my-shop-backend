const express = require('express');
const router = express.Router();

const {
  registerAdmin,
  loginAdmin,
  approveSeller,
  approveAllPendingSellers,
  rejectSeller,
  getPendingSellers,
  getStats,
  getAllReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getAllComplaints,
  resolveComplaint,
  getAllFeedbacks,
  getSellerAccountAndCommission,
  unbanSeller,
  banSeller,
  getAllSellers,
  trackByBuyer,
  trackBySeller,
  trackAllOrdersForAdmin,
  updateDeliveryStatus,
  updateSatisfactionStatus,
  updateOrderStatus,
  getPendingLandlords,
  approveOrRejectLandlord,
  banLandlord,
  unbanLandlord,
  getAllApprovedLandlords,
} = require('../controllers/adminController');

const { verifyToken, verifyAdmin, verifySeller } = require('../middleware/authMiddleware');

// ✅ Admin Auth Routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// ✅ Seller Ban/Unban
router.put('/sellers/:sellerId/ban', verifyToken, verifyAdmin, banSeller);
router.put('/sellers/:sellerId/unban', verifyToken, verifyAdmin, unbanSeller);

// ✅ Seller Management
router.get('/sellers', verifyToken, verifyAdmin, getAllSellers);
router.get('/sellers/pending', verifyToken, verifyAdmin, getPendingSellers);
router.post('/sellers/approve/:sellerId', verifyToken, verifyAdmin, approveSeller);
router.post('/sellers/approve-all', verifyToken, verifyAdmin, approveAllPendingSellers);
router.post('/sellers/reject/:sellerId', verifyToken, verifyAdmin, rejectSeller);

// ✅ Dashboard Stats
router.get('/stats', verifyToken, verifyAdmin, getStats);

// ✅ Reminder Routes
router.get('/reminders', verifyToken, verifyAdmin, getAllReminders);
router.post('/reminders', verifyToken, verifyAdmin, createReminder);
router.put('/reminders/:id', verifyToken, verifyAdmin, updateReminder);
router.delete('/reminders/:id', verifyToken, verifyAdmin, deleteReminder);

// ✅ Complaints
router.get('/complaints', verifyToken, verifyAdmin, getAllComplaints);
router.post('/complaints/resolve/:id', verifyToken, verifyAdmin, resolveComplaint);

// ✅ Feedback
router.get('/feedback', verifyToken, verifyAdmin, getAllFeedbacks);

// ✅ Seller Info for Orders
router.get('/orders/:orderId/seller-info', verifyToken, verifyAdmin, getSellerAccountAndCommission);

// ✅ Orders & Tracking
router.get('/orders', verifyToken, verifyAdmin, trackAllOrdersForAdmin); // 🟦 Admin tracking (orders + bargains)
router.put('/orders/:orderId/delivery-status', verifyToken, verifyAdmin, updateDeliveryStatus); // 🚚 Admin updates shipment

// 🟩 Optional: Use these if admin wants to impersonate buyer/seller tracking too
router.post('/track/buyer', verifyToken, verifyAdmin, trackByBuyer); // Optional
router.get('/track/seller/:sellerId', verifyToken, verifyAdmin, trackBySeller); // Optional

// ✅ Admin updates satisfaction status
router.put('/orders/:orderId/satisfaction', verifyToken, verifyAdmin, updateSatisfactionStatus);

router.put('/orders/:orderId/status', verifyToken, verifyAdmin, updateOrderStatus);

// Landlord Management
router.get('/pending-landlords', verifyToken, verifyAdmin, getPendingLandlords);
router.put('/landlord/:id/approve', verifyToken, verifyAdmin, approveOrRejectLandlord);

router.put('/landlords/:landlordId/ban', verifyToken, verifyAdmin, banLandlord);
router.put('/landlords/:landlordId/unban', verifyToken, verifyAdmin, unbanLandlord);

router.get('/landlords', verifyToken, verifyAdmin, getAllApprovedLandlords);




module.exports = router;
