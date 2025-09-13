const Transaction = require('../models/transactionModel');

// Record payment completion
exports.recordPayment = async (req, res) => {
  try {
    const { userId, propertyId, type, amount, status } = req.body;

    if (!userId || !propertyId || !type || !amount || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const transaction = new Transaction({
      userId,
      propertyId,
      type,
      amount,
      status,
    });

    await transaction.save();

    res.status(201).json({ message: 'Transaction recorded', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record transaction', error: error.message });
  }
};
