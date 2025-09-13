const Complaint = require('../models/complaintModel');

// Get all complaints
// ✅ Corrected getAllComplaints
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find(); // No populate
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};


// Resolve a complaint
exports.resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const adminId = req.user.id; // Make sure verifyToken adds this to req.user

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (complaint.status === 'resolved') {
      return res.status(400).json({ message: 'Complaint already resolved' });
    }

    complaint.status = 'resolved';
    complaint.response = response || complaint.response;
    complaint.resolvedBy = adminId;
    complaint.resolvedAt = new Date();

    await complaint.save();

    res.status(200).json({ message: 'Complaint resolved successfully', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resolve complaint', error: error.message });
  }
};

// Create a complaint (Buyer or Seller)
exports.createComplaint = async (req, res) => {
  try {
    const { subject, description, buyerPhone, sellerId } = req.body;

    if (!subject || !description || (!buyerPhone && !sellerId)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const complaint = new Complaint({
      subject,
      description,
      userId: buyerPhone || sellerId, // This will be a String now, not ObjectId
    });

    await complaint.save();

    res.status(201).json({ message: 'Complaint submitted', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit complaint', error: error.message });
  }
};

// Get complaints by buyer phone or seller ID
exports.getUserComplaints = async (req, res) => {
  try {
    const { userId } = req.params; // e.g., buyerPhone or sellerId

    const complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user complaints', error: error.message });
  }
};
