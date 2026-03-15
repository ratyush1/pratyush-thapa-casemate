const express = require('express');
const {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  uploadCaseDetails,
  uploadCaseFile,
  uploadTempDocument,
  markReviewed,
  getDocumentByAppointment,
} = require('../controllers/appointmentController');
const { getAppointmentChat, createAppointmentChat, sendAppointmentMessage } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

// allow clients to upload a document first and get a public URL to include when creating appointment
// removed separate temp upload route - document is now required at booking time
router.get('/', getMyAppointments);
// More specific routes first to avoid wildcard conflicts
router.get('/:appointmentId/document/:filename', getDocumentByAppointment);
router.get('/:id/chat', getAppointmentChat);
router.get('/:id', getAppointmentById);
// Chat for appointment
router.post('/:id/chat', createAppointmentChat);
router.post('/:id/chat/messages', sendAppointmentMessage);
// create appointment (client) — expects multipart/form-data with a required `document` file
router.post('/', authorize('client'), upload.single('document'), createAppointment);
router.patch('/:id/status', authorize('lawyer', 'admin'), updateAppointmentStatus);
router.patch('/:id/review', authorize('lawyer'), markReviewed);
router.patch('/:id/case', authorize('client'), uploadCaseDetails);
// Upload a single case document for an appointment (client only)
router.post('/:id/case/upload', authorize('client'), upload.single('document'), uploadCaseFile);

// deletion endpoint - both client and lawyer (or admin) after completion/payment
router.delete('/:id', authorize('client','lawyer','admin'), (req, res, next) => {
  return require('../controllers/appointmentController').deleteAppointment(req, res, next);
});

module.exports = router;
