const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    // Optional sender (for client-lawyer chats)
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderRole: { type: String, enum: ['client', 'lawyer', 'assistant', 'system'] },
    escalationSuggested: { type: Boolean, default: false },
    escalationReason: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    suggestedLawyers: [
      {
        id: { type: String },
        score: { type: Number },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New conversation' },
    messages: [messageSchema],
    // Unread indicators for appointment chats
    unreadForLawyer: { type: Boolean, default: false },
    unreadForClient: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
