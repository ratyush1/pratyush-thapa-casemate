const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');
const Appointment = require('../models/Appointment');
const Chat = require('../models/Chat');
const Payment = require('../models/Payment');
const { getIO, getUserSocketIds } = require('../utils/socket');
const emailService = require('../utils/emailService');
const { uploadLocalFileToCloudinary, removeLocalFile } = require('../utils/cloudinaryUpload');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role, phone } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const emailNorm = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Only client and lawyer can register. Admin is a single pre-created account.
    const allowedRole = role === 'lawyer' ? 'lawyer' : 'client';
    const user = new User({ name, email: emailNorm, password, role: allowedRole, phone });
    await user.save();
    if (user.role === 'lawyer') {
      await LawyerProfile.create({
        user: user._id,
        specialization: req.body.specialization || [],
        bio: req.body.bio || '',
        hourlyRate: req.body.hourlyRate || 0,
      });
    }

    try {
      const io = getIO();
      io.emit('user_updated', { userId: user._id.toString(), action: 'created' });
      io.emit('stats_updated', { reason: 'user_created' });
      if (user.role === 'lawyer') {
        io.emit('lawyer_updated', { lawyerId: user._id.toString(), action: 'created' });
      }
    } catch (e) {
      // ignore socket errors
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err.message);
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    // Find user in database (email is stored lowercase from register)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let profile = null;
    if (user.role === 'lawyer') {
      profile = await LawyerProfile.findOne({ user: user._id });
    }
    res.json({ success: true, user, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const allowed = ['name', 'phone'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    });

    await user.save();
    const safeUser = await User.findById(user._id).select('-password');

    try {
      const io = getIO();
      const userId = safeUser._id.toString();
      io.emit('user_updated', { userId, action: 'profile_updated' });
      const socketIds = getUserSocketIds(userId) || [];
      socketIds.forEach((sid) => {
        io.to(sid).emit('user_updated', { userId, action: 'profile_updated' });
      });
      if (safeUser.role === 'lawyer') {
        io.emit('lawyer_updated', { lawyerId: userId, action: 'profile_updated' });
      }
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadMyAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar uploaded. Choose an image (JPEG, PNG, GIF, WebP).' });
    }

    let avatarUrl = '/uploads/avatars/' + req.file.filename;
    const uploaded = await uploadLocalFileToCloudinary(req.file.path, {
      folder: 'casemate/avatars',
      resourceType: 'image',
    });
    if (uploaded?.url) {
      avatarUrl = uploaded.url;
      await removeLocalFile(req.file.path);
    }

    const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    try {
      const io = getIO();
      const userId = user._id.toString();
      io.emit('user_updated', { userId, action: 'avatar_updated', avatar: avatarUrl });
      const socketIds = getUserSocketIds(userId) || [];
      socketIds.forEach((sid) => {
        io.to(sid).emit('user_updated', { userId, action: 'avatar_updated', avatar: avatarUrl });
      });
      if (user.role === 'lawyer') {
        io.emit('lawyer_updated', { lawyerId: userId, action: 'avatar_updated' });
      }
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, user, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMyAccount = async (req, res) => {
  try {
    const { confirmation, password } = req.body || {};
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Confirmation must be exactly DELETE' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin account cannot be deleted from this endpoint' });
    }

    if (!password || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const userId = user._id;
    const appointments = await Appointment.find({
      $or: [{ client: userId }, { lawyer: userId }],
    }).select('_id');
    const appointmentIds = appointments.map((appointment) => appointment._id);

    const chatQuery = {
      $or: [
        { user: userId },
        { 'messages.sender': userId },
      ],
    };
    if (appointmentIds.length > 0) {
      chatQuery.$or.push({ appointment: { $in: appointmentIds } });
    }

    const paymentQuery = { user: userId };
    if (appointmentIds.length > 0) {
      paymentQuery.$or = [{ user: userId }, { appointment: { $in: appointmentIds } }];
      delete paymentQuery.user;
    }

    await Promise.all([
      LawyerProfile.deleteOne({ user: userId }),
      Appointment.deleteMany({ $or: [{ client: userId }, { lawyer: userId }] }),
      Chat.deleteMany(chatQuery),
      Payment.deleteMany(paymentQuery),
      User.deleteOne({ _id: userId }),
    ]);

    try {
      const io = getIO();
      const deletedUserId = userId.toString();
      io.emit('user_updated', { userId: deletedUserId, action: 'deleted' });
      io.emit('stats_updated', { reason: 'user_deleted' });

      const socketIds = getUserSocketIds(deletedUserId) || [];
      socketIds.forEach((sid) => {
        io.to(sid).emit('auth_logout', { reason: 'account_deleted' });
      });
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, message: 'Account and related data deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
