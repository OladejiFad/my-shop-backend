// middleware/authenticateBuyerToken.js
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'tradysecretkey';

const authenticateBuyerToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.type !== 'buyer' || !decoded.buyerPhone) {
      return res.status(403).json({ message: 'Invalid buyer token' });
    }

    req.user = { role: 'buyer', phone: decoded.buyerPhone };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticateBuyerToken;
