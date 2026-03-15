const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const LawyerProfile = require('../models/LawyerProfile');

// Recalculate and persist a lawyer's average rating from non-hidden reviews
const recalcLawyerRating = async (lawyerUserId) => {
  const reviews = await Review.find({ lawyer: lawyerUserId, isHidden: false });
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  await LawyerProfile.findOneAndUpdate(
    { user: lawyerUserId },
    { rating: Math.round(avg * 10) / 10, totalReviews: total }
  );
};

// POST /api/reviews
// Client submits a review for a completed appointment
exports.submitReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating) {
      return res.status(400).json({ success: false, message: 'appointmentId and rating are required' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.client.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only review your own appointments' });
    }
    if (appointment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review completed appointments' });
    }

    const review = await Review.create({
      client: req.user.id,
      lawyer: appointment.lawyer,
      appointment: appointmentId,
      rating: ratingNum,
      comment: (comment || '').trim().slice(0, 1000),
    });

    await recalcLawyerRating(appointment.lawyer.toString());

    const populated = await Review.findById(review._id).populate('client', 'name avatar');
    res.status(201).json({ success: true, review: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this appointment' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/lawyer/:lawyerId
// Public — returns visible reviews for a lawyer
exports.getLawyerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ lawyer: req.params.lawyerId, isHidden: false })
      .populate('client', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/my-reviews
// Authenticated client — get their submitted reviews (to check which apts are already reviewed)
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ client: req.user.id })
      .select('appointment rating comment createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/reviews  (called from adminController)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('client', 'name email')
      .populate('lawyer', 'name email')
      .populate('appointment', 'date timeSlot status')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/reviews/:id/visibility  (called from adminController)
exports.toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.isHidden = !review.isHidden;
    await review.save();

    // Recalculate lawyer rating after hide/show
    await recalcLawyerRating(review.lawyer.toString());

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
