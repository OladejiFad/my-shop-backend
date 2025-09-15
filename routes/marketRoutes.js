const express = require('express');
const router = express.Router();
const { getMarketStatus } = require('../controllers/marketController');

// Use "/" because the prefix will be added in server.js
router.get('/', getMarketStatus);

module.exports = router;
