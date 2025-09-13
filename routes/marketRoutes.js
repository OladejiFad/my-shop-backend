const express = require('express');
const router = express.Router();
const { getMarketStatus } = require('../controllers/marketController');

router.get('/market-status', getMarketStatus);

module.exports = router;
