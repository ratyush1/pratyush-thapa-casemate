const express = require('express');
const {
  getUsers,
  updateUser,
  verifyLawyer,
  getLawyersWithDocuments,
  getChats,
  getStats,
  getAllAppointments,
} = require('../controllers/adminController');
const { getAllReviews, toggleReviewVisibility } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.get('/lawyers', getLawyersWithDocuments);
router.patch('/users/:id', updateUser);
router.post('/lawyers/:id/verify', verifyLawyer);
router.get('/chats', getChats);
router.get('/stats', getStats);
router.get('/appointments', getAllAppointments);
router.get('/reviews', getAllReviews);
router.patch('/reviews/:id/visibility', toggleReviewVisibility);

module.exports = router;
