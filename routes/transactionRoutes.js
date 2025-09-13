const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/record', verifyToken, transactionController.recordPayment);

module.exports = router;
