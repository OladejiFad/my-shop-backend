const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');

// ✅ Middleware to verify JWT and attach user
const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Authorization header:', authHeader);

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1].trim();
  console.log('Token:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    const id = decoded.id || decoded._id;
    const role = decoded.role || 'user';

    if (!id) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    let user;
    if (role === 'admin') {
      user = await Admin.findById(id).select('-password');
    } else {
      user = await User.findById(id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = { ...user.toObject(), role }; // attach role explicitly
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// ✅ Check if user is an Admin
const verifyAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admins only.' });
};

// ✅ Check if user is a Seller
const isSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  if (req.user.role?.toLowerCase() === 'seller') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Sellers only.' });
};

// ✅ Check if user is Seller or Admin
const isSellerOrAdmin = (req, res, next) => {
  if (req.user?.role === 'seller' || req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Seller or Admin only.' });
};

// ✅ Check if user is a Buyer
const verifyBuyer = (req, res, next) => {
  if (req.user?.role === 'buyer') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Buyers only.' });
};

// ✅ For Refund Requests (by Buyers only)
const verifyRefundRequest = (req, res, next) => {
  if (req.user?.role === 'buyer') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Refund requests are for buyers only.' });
};

// ✅ Guest buyers allowed
const verifyBuyerOrGuest = (req, res, next) => {
  if (req.user && req.user.role === 'buyer') {
    return next();
  }

  const guestBuyerId =
    req.headers['x-guest-buyer-id'] ||
    (req.cookies && req.cookies.guestBuyerId) ||
    req.query.guestBuyerId;

  if (guestBuyerId) {
    req.guestBuyerId = guestBuyerId;
    return next();
  }

  return res.status(401).json({ message: 'Access denied. Buyer or guest buyer required.' });
};

// ✅ Check if user is Admin, Seller, or Buyer
const verifyAdminSellerBuyer = (req, res, next) => {
  if (req.user && ['admin', 'seller', 'buyer'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin, Seller, or Buyer only.' });
};

// ✅ Check if user is a Landlord
const isLandlord = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  if (req.user.role?.toLowerCase() === 'landlord') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Landlords only.' });
};


module.exports = {
  verifyToken,
  verifyAdmin,
  isSeller,
  isSellerOrAdmin,
  verifyBuyer,
  verifyRefundRequest,
  verifyBuyerOrGuest,
  verifyAdminSellerBuyer,
  isLandlord,
};
