// middleware/validateOrderProducts.js

module.exports = (req, res, next) => {
  const { buyerName, buyerPhone, buyerLocation, products } = req.body;

  if (
    !buyerName || typeof buyerName !== 'string' ||
    !buyerPhone || typeof buyerPhone !== 'string' ||
    !buyerLocation || typeof buyerLocation !== 'string'
  ) {
    return res.status(400).json({ message: 'Buyer name, phone, and location are required and must be strings.' });
  }

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'At least one product is required.' });
  }

  for (const p of products) {
    if (
      !p.productId || typeof p.productId !== 'string' ||
      !p.sellerId || typeof p.sellerId !== 'string' ||
      typeof p.quantity !== 'number' || p.quantity <= 0 ||
      typeof p.price !== 'number' || p.price <= 0
    ) {
      return res.status(400).json({
        message: 'Each product must have productId (string), sellerId (string), quantity (positive number), and price (positive number).',
      });
    }
  }

  next();
};
