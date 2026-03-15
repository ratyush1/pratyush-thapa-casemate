const Chat = require('../models/Chat');
const { processMessage, getCaseOptions } = require('../services/chatbotService');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { getIO, getUserSocketIds, isUserOnline } = require('../utils/socket');

// Simple in-memory rate limiter per user for chat messages
// Not suitable for multi-process production; use Redis in prod
const MESSAGE_WINDOW_MS = 10000; // 10s window
const MESSAGE_MAX = 8; // max messages per window
const rateMap = new Map();

exports.createChat = async (req, res) => {
  try {
    const chat = await Chat.create({ user: req.user.id });
    res.status(201).json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, selectedCaseId } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message content required' });

    // existing chatbot-style chat (owned by user)
    let chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    chat.messages.push({ role: 'user', content: content.trim() });
    // processMessage is async (RAG pipeline) — await it
    const botResult = await processMessage(content, chat.messages, { selectedCaseId });
    const reply = botResult?.content || 'Sorry, I could not generate a response.';
    const confidence = typeof botResult?.confidence === 'number' ? botResult.confidence : undefined;
    const escalationSuggested = typeof botResult?.escalationSuggested === 'boolean' ? botResult.escalationSuggested : false;
    const escalationReason = typeof botResult?.escalationReason === 'string' ? botResult.escalationReason : undefined;
    const suggestedLawyers = Array.isArray(botResult?.suggestedLawyers) ? botResult.suggestedLawyers : [];
    chat.messages.push({
      role: 'assistant',
      content: reply,
      confidence,
      escalationSuggested,
      escalationReason,
      suggestedLawyers,
    });
    if (escalationSuggested) chat.escalationSuggested = true;
    await chat.save();

    const lastUser = chat.messages[chat.messages.length - 2];
    const lastBot = chat.messages[chat.messages.length - 1];
    res.json({
      success: true,
      userMessage: lastUser,
      assistantMessage: lastBot,
      escalationSuggested,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAvailableCases = async (req, res) => {
  try {
    const groupedCases = getCaseOptions();
    res.json({ success: true, cases: groupedCases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Appointment chat: create or return existing chat for an appointment
exports.getAppointmentChat = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('client lawyer', 'name email');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const isClient = appointment.client._id.toString() === req.user.id.toString();
    const isLawyer = appointment.lawyer._id.toString() === req.user.id.toString();
    if (!isClient && !isLawyer) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // allow chat only after appointment accepted
    if (appointment.status !== 'accepted') {
      return res.status(403).json({ success: false, message: 'Chat available only after appointment is accepted' });
    }
    let chat = await Chat.findOne({ appointment: appointment._id }).populate('messages.sender', 'name email');
    if (!chat) {
      return res.json({ success: true, chat: null });
    }
    // clear unread flags for the viewer
    let changed = false;
    if (isClient) {
      if (chat.unreadForClient) { chat.unreadForClient = false; changed = true; }
    }
    if (isLawyer) {
      if (chat.unreadForLawyer) { chat.unreadForLawyer = false; changed = true; }
    }
    if (changed) await chat.save();
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAppointmentChat = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const isClient = appointment.client.toString() === req.user.id.toString();
    const isLawyer = appointment.lawyer.toString() === req.user.id.toString();
    if (!isClient && !isLawyer) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // only allow creating appointment chat after acceptance
    if (appointment.status !== 'accepted') {
      return res.status(403).json({ success: false, message: 'Chat available only after appointment is accepted' });
    }
    let chat = await Chat.findOne({ appointment: appointment._id });
    if (!chat) {
      chat = await Chat.create({ user: appointment.client, appointment: appointment._id, title: `Appointment chat ${appointment._id}` });
    }
    const populated = await Chat.findById(chat._id).populate('messages.sender', 'name email');
    res.status(201).json({ success: true, chat: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Send a message in an appointment chat (by client or lawyer)
exports.sendAppointmentMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message content required' });
    // validation: length limit
    if (content.length > 2000) return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars)' });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const isClient = appointment.client.toString() === req.user.id.toString();
    const isLawyer = appointment.lawyer.toString() === req.user.id.toString();
    if (!isClient && !isLawyer) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // allow messaging only after appointment accepted
    if (appointment.status !== 'accepted') {
      return res.status(403).json({ success: false, message: 'Chat available only after appointment is accepted' });
    }
    let chat = await Chat.findOne({ appointment: appointment._id });
    if (!chat) {
      chat = await Chat.create({ user: appointment.client, appointment: appointment._id, title: `Appointment chat ${appointment._id}` });
    }
    // Rate limit per user
    const now = Date.now();
    const uid = req.user.id;
    const entry = rateMap.get(uid) || [];
    // remove expired
    const filtered = entry.filter((ts) => now - ts < MESSAGE_WINDOW_MS);
    if (filtered.length >= MESSAGE_MAX) {
      return res.status(429).json({ success: false, message: 'Too many messages — slow down.' });
    }
    filtered.push(now);
    rateMap.set(uid, filtered);
    const senderRole = isLawyer ? 'lawyer' : isClient ? 'client' : 'system';
    // message `role` must be one of ['user','assistant','system'] per schema
    // use 'user' for human participants and keep `senderRole` for client/lawyer metadata
    chat.messages.push({ role: 'user', content: content.trim(), sender: req.user.id, senderRole });
    await chat.save();
    const populated = await Chat.findById(chat._id).populate('messages.sender', 'name email');

    // Emit real-time update to appointment room
    try {
      const io = getIO();
      io.to(`appointment_${appointment._id}`).emit('appointment_message', { chat: populated });

      // Determine recipient (the other party)
      const recipientId = isLawyer ? appointment.client.toString() : appointment.lawyer.toString();
      const recipientRole = isLawyer ? 'client' : 'lawyer';
      // If recipient not online, mark unread flag on chat
      if (!isUserOnline(recipientId)) {
        if (recipientRole === 'lawyer') populated.unreadForLawyer = true;
        else populated.unreadForClient = true;
        await Chat.findByIdAndUpdate(populated._id, { unreadForLawyer: populated.unreadForLawyer, unreadForClient: populated.unreadForClient });
        // send simple placeholder notifications
        try {
          const { sendEmailNotification, sendPushNotification } = require('../utils/notify');
          // fetch recipient user email if needed (best-effort)
          const User = require('../models/User');
          const recipientUser = await User.findById(recipientId).select('email name');
          const subj = 'New message on your appointment';
          const msg = `You have a new message for appointment ${appointment._id}`;
          if (recipientUser?.email) sendEmailNotification(recipientUser.email, subj, msg);
          sendPushNotification(recipientId, { title: subj, body: msg, appointmentId: appointment._id });
        } catch (e) {
          console.error('notify error', e);
        }
      } else {
        // if online, send a lightweight notification event to their sockets
        const sockets = getUserSocketIds(recipientId);
        // send both a notification and the full chat update directly to each socket id
        sockets.forEach((sid) => {
          try {
            getIO().to(sid).emit('appointment_notification', { appointmentId: appointment._id, chatId: populated._id });
          } catch (e) {}
          try {
            getIO().to(sid).emit('appointment_message', { chat: populated });
          } catch (e) {}
        });
      }
    } catch (e) {
      // ignore if socket not initialized
    }

    res.json({ success: true, chat: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markEscalated = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { escalated: true, appointment: req.body.appointmentId },
      { new: true }
    );
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
