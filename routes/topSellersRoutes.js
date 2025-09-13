const express = require('express');
const router = express.Router();
const { getTopSellersOfMonth } = require('../controllers/orderController');

router.get('/top-sellers', getTopSellersOfMonth);

module.exports = router;
