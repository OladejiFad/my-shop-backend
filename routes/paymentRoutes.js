const express = require('express');
const { initializePayment, verifyPayment, verifyWebhook } = require('../controllers/paymentController');
const router = express.Router();

// Initialize Paystack transaction
router.post('/paystack/init', initializePayment);

// Verify Paystack transaction by reference
router.get('/paystack/verify/:reference', verifyPayment);

// Paystack webhook endpoint (expects JSON, accepts any content-type)
router.post('/paystack/webhook', express.json({ type: '*/*' }), verifyWebhook);

module.exports = router;
