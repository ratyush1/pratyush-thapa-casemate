const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true, // one review per appointment
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    isHidden: { type: Boolean, default: false }, // for admin moderation
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
