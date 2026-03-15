const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');
const Chat = require('../models/Chat');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');

exports.getUsers = async (req, res) => {
  try {
    const { role, excludeAdmin } = req.query;
    let filter = {};
    if (excludeAdmin === 'true') {
      filter = { role: { $in: ['client', 'lawyer'] } };
    } else if (role) {
      filter = { role };
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { isActive, isVerified } = req.body;
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;
    await user.save();

    try {
      const io = getIO();
      const userId = user._id.toString();
      io.emit('user_updated', { userId, action: 'admin_updated' });
      io.emit('stats_updated', { reason: 'user_updated' });
      if (user.role === 'lawyer') {
        io.emit('lawyer_updated', { lawyerId: userId, action: 'admin_updated' });
      }
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all lawyers with their profiles and documents (for admin verification)
exports.getLawyersWithDocuments = async (req, res) => {
  try {
    // Only include profiles where the populated user exists and has role 'lawyer'
    const profiles = await LawyerProfile.find({}).populate({ path: 'user', select: 'name email role isActive' });
    const list = profiles
      .filter((p) => p.user && p.user.role === 'lawyer')
      .map((p) => ({
        user: p.user,
        profile: p,
        documents: p.documents || [],
        verified: p.verified,
      }));
    res.json({ success: true, lawyers: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const { sendEmailNotification, sendPushNotification } = require('../utils/notify');
const { getUserSocketIds, getIO } = require('../utils/socket');

exports.verifyLawyer = async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ user: req.params.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Lawyer profile not found' });
    const docs = profile.documents || [];
    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'Lawyer must add at least one document (upload or link) before verification.' });
    }
    profile.verified = true;
    await profile.save();
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select('-password');

    // Send notifications: email, push stub, and realtime socket event
    try {
      const subject = 'Your lawyer account has been verified';
      const message = `Hi ${user.name},\n\nYour account has been verified by the admin. Your profile is now visible to clients and you can accept appointments.`;
      sendEmailNotification(user.email, subject, message).catch(() => {});
      sendPushNotification(user._id.toString(), { type: 'verified', title: subject, body: message }).catch(() => {});
      try {
        const io = getIO();
        const socketIds = getUserSocketIds(user._id.toString());
        socketIds.forEach((sid) => {
          io.to(sid).emit('user_notification', { type: 'verified', title: subject, body: message });
        });
        io.emit('lawyer_updated', { lawyerId: user._id.toString(), action: 'verified' });
        io.emit('user_updated', { userId: user._id.toString(), action: 'verified' });
        io.emit('stats_updated', { reason: 'lawyer_verified' });
      } catch (e) {
        console.info('verifyLawyer: socket notify skipped', e?.message || e);
      }
    } catch (e) {
      console.error('verifyLawyer: notification error', e?.message || e);
    }

    res.json({ success: true, profile, message: 'Lawyer verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100);
    const sanitizedChats = chats.map((chat) => ({
      _id: chat._id,
      user: chat.user,
      appointment: chat.appointment,
      escalated: chat.escalated,
      unreadForLawyer: chat.unreadForLawyer,
      unreadForClient: chat.unreadForClient,
      messagesCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
    }));
    res.json({ success: true, chats: sanitizedChats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [users, lawyers, appointments, payments, chats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'lawyer' }),
      Appointment.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      Chat.countDocuments(),
    ]);
    const revenue = await Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.json({
      success: true,
      stats: {
        users,
        lawyers,
        appointments,
        payments,
        chats,
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({})
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ date: -1 });
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
