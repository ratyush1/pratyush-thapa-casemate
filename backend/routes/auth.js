const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  getMe,
  updateMe,
  uploadMyAvatar,
  deleteMyAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const uploadAvatar = require('../middleware/uploadAvatar');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  register
);
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);
router.post(
  '/forgot-password/request',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  requestPasswordResetOtp
);
router.post(
  '/forgot-password/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6 digit code'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  verifyPasswordResetOtp
);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, uploadAvatar.single('avatar'), uploadMyAvatar);
router.delete('/me', protect, deleteMyAccount);

module.exports = router;
