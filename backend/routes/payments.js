const express = require('express');
const {
	initiateEsewaPayment,
	verifyEsewaPayment,
	simulatePayment,
	getPaymentsByUser,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/esewa/initiate', initiateEsewaPayment);
router.post('/esewa/verify', verifyEsewaPayment);
router.post('/simulate', simulatePayment);
router.get('/', getPaymentsByUser);

module.exports = router;
