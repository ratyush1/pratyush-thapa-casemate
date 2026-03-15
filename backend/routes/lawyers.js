const express = require('express');
const { getLawyers, getLawyerById, updateMyProfile, getMyProfile, addDocument, uploadDocument, removeDocument, uploadAvatar } = require('../controllers/lawyerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadAvatarMiddleware = require('../middleware/uploadAvatar');

const router = express.Router();

router.get('/', getLawyers);
router.get('/me/profile', protect, authorize('lawyer'), getMyProfile);
router.put('/me/profile', protect, authorize('lawyer'), updateMyProfile);
router.post('/me/documents', protect, authorize('lawyer'), addDocument);
router.post('/me/documents/upload', protect, authorize('lawyer'), upload.single('file'), uploadDocument);
router.post('/me/avatar', protect, authorize('lawyer'), uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.delete('/me/documents/:index', protect, authorize('lawyer'), removeDocument);
router.get('/:id', getLawyerById);

module.exports = router;
