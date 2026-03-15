const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    duration: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    caseDetails: { type: String, default: '' },
    caseDocuments: [{ type: String }],
    // has the assigned lawyer reviewed the case details/documents before accepting
    lawyerReviewed: { type: Boolean, default: false },
    lawyerReviewedAt: { type: Date },
    notes: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
