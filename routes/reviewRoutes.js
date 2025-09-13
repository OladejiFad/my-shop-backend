const express = require('express');
const { addReview, getReviews } = require('../controllers/reviewController');
// const authenticateBuyerToken = require('../middleware/authenticateBuyerToken'); // REMOVE THIS

const router = express.Router();

// Allow anonymous reviews (no token required)
router.post('/add', addReview);

// Publicly fetch reviews
router.get('/:targetType/:targetId', getReviews);

module.exports = router;
