const express = require('express');
const {
  submitReview,
  getLawyerReviews,
  getMyReviews,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public: get visible reviews for a specific lawyer
router.get('/lawyer/:lawyerId', getLawyerReviews);

// Authenticated routes
router.use(protect);

// Client submits a review
router.post('/', authorize('client'), submitReview);

// Client fetches their own reviews (to check which appointments they've already reviewed)
router.get('/my-reviews', getMyReviews);

module.exports = router;
