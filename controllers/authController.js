const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Store = require('../models/storeModel');



// Register Seller (cleaned up version)
exports.registerSeller = async (req, res) => {
  const { name, phone, password, location, occupation, idCard, nin } = req.body;

  try {
    const nigeriaPhoneRegex = /^\+234[789]\d{9}$/;
    if (!nigeriaPhoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid Nigerian phone number format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!['Lagos', 'Ibadan'].includes(location)) {
      return res.status(400).json({ message: 'Location must be either Lagos or Ibadan' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const newUser = new User({
      name,
      phone,
      password,
      location,
      role: 'seller',
      approved: false,
      occupation,
      idCard,
      nin,
    });

    await newUser.save();

    res.status(201).json({ message: `Seller registered successfully. Awaiting admin approval.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
};



// Login User (Buyer or Seller)
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.banned) {
      return res.status(403).json({ message: 'Your account has been banned by the admin' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let hasStore = false;
    if (user.role === 'seller') {
      const store = await Store.findOne({ sellerId: user._id });
      hasStore = !!store;
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isSeller: user.role === 'seller',
        isApprovedSeller: user.approved,
        hasStore,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

// Get Seller Profile
exports.getSellerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile', error: err.message });
  }
};


// Register Landlord
exports.registerLandlord = async (req, res) => {
  const { name, phone, password, location, bvn, nin, internationalPassport } = req.body;

  console.log('Incoming landlord registration:', req.body); // 🐛 Log incoming data

  try {
    const nigeriaPhoneRegex = /^\+234[789]\d{9}$/;
    if (!nigeriaPhoneRegex.test(phone)) {
      console.warn('Invalid phone format:', phone);
      return res.status(400).json({ message: 'Invalid Nigerian phone number format' });
    }

    if (password.length < 8) {
      console.warn('Password too short');
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!['Lagos', 'Ibadan'].includes(location)) {
      console.warn('Invalid location:', location);
      return res.status(400).json({ message: 'Location must be either Lagos or Ibadan' });
    }

    if (!bvn) {
      console.warn('Missing BVN');
      return res.status(400).json({ message: 'BVN is required' });
    }

    if (!nin && !internationalPassport) {
      console.warn('Missing NIN and International Passport');
      return res.status(400).json({ message: 'Either NIN or International Passport is required' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.warn('Phone already registered:', phone);
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const newUser = new User({
      name,
      phone,
      password,
      location,
      role: 'landlord',
      bvn,
      nin,
      internationalPassport,
      approved: false,
    });

    await newUser.save();

    console.log('Landlord registration successful:', newUser._id); // ✅ Success log
    res.status(201).json({ message: 'Landlord registered successfully. Awaiting admin approval.' });
  } catch (err) {
    console.error('Server error during landlord registration:', err); // 🔥 Full stack trace
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
};


// In your authController.js

exports.getLandlordProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.role !== 'landlord') {
      return res.status(404).json({ message: 'Landlord not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching landlord profile', error: err.message });
  }
};
