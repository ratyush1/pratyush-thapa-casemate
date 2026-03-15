const mongoose = require('mongoose');

const lawyerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: [{ type: String, trim: true }],
    barNumber: { type: String, trim: true },
    experience: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    hourlyRate: { type: Number, default: 0 },
    availability: {
      days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
    },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    // Documents submitted by lawyer for admin verification (e.g. bar license, ID)
    documents: [{
      name: { type: String, required: true, trim: true },
      url: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LawyerProfile', lawyerProfileSchema);
