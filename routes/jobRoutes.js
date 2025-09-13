const express = require('express');
const router = express.Router();
const { getTradyJobs, createTradyJob } = require('../controllers/jobController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/trady', getTradyJobs); // Public access
router.post('/trady', verifyToken, verifyAdmin, createTradyJob); // ✅ FIXED

module.exports = router;
