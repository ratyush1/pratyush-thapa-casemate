const express = require('express');
const { createChat, getMyChats, getChatById, sendMessage, markEscalated, getAvailableCases } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('client', 'admin'));

router.get('/', getMyChats);
router.get('/case-options', getAvailableCases);
router.post('/', createChat);
router.get('/:id', getChatById);
router.post('/:id/message', sendMessage);
router.patch('/:id/escalate', markEscalated);

module.exports = router;
