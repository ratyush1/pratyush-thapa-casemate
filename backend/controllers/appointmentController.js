const Appointment = require('../models/Appointment');
const Chat = require('../models/Chat');
const LawyerProfile = require('../models/LawyerProfile');
const User = require('../models/User');
const { getIO, getUserSocketIds } = require('../utils/socket');
const { sendEmailNotification } = require('../utils/notify');

exports.createAppointment = async (req, res) => {
  try {
    // Expect multipart/form-data with a required `document` file
    const { lawyerId, date, timeSlot, caseDetails, duration } = req.body;
    if (!lawyerId || !date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'lawyerId, date, and timeSlot required' });
    }
    // require uploaded document
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required when booking an appointment' });
    }
    // prepare document public path
    const publicPath = `/uploads/documents/${req.file.filename}`;
    const lawyer = await User.findOne({ _id: lawyerId, role: 'lawyer' });
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });

    // Allow only one active appointment per client-lawyer pair at a time.
    // Client can book again only after previous request is rejected or completed.
    const existingActiveAppointment = await Appointment.findOne({
      client: req.user.id,
      lawyer: lawyerId,
      status: { $in: ['pending', 'accepted'] },
    }).select('_id status date timeSlot');
    if (existingActiveAppointment) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active appointment request with this lawyer. You can book another only after it is rejected or completed.',
        existingAppointment: existingActiveAppointment,
      });
    }

    const profile = await LawyerProfile.findOne({ user: lawyerId });
    const amount = (profile?.hourlyRate || 100) * ((duration || 60) / 60);
    const appointment = await Appointment.create({
      client: req.user.id,
      lawyer: lawyerId,
      date: new Date(date),
      timeSlot,
      duration: duration || 60,
      caseDetails: caseDetails || '',
      caseDocuments: [publicPath],
      amount: Math.round(amount * 100) / 100,
    });
    const populated = await Appointment.findById(appointment._id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    // notify assigned lawyer (and the client) about new appointment request
    try {
      const io = getIO();
      const payload = { appointmentId: populated._id.toString(), body: 'New appointment requested', appointment: populated };
      // send to the appointment room in case either party has already joined
      io.to(`appointment_${populated._id}`).emit('appointment_notification', payload);
      // send directly to lawyer sockets
      const lawyerId = populated.lawyer && populated.lawyer._id ? populated.lawyer._id.toString() : (populated.lawyer ? populated.lawyer.toString() : null);
      if (lawyerId) {
        const socketIds = getUserSocketIds(lawyerId) || [];
        socketIds.forEach((sid) => io.to(sid).emit('appointment_notification', payload));
      }
      // also notify the client who created the appointment so their UI can update in real‑time
      const clientId = populated.client && populated.client._id ? populated.client._id.toString() : (populated.client ? populated.client.toString() : null);
      if (clientId) {
        const clientSockets = getUserSocketIds(clientId) || [];
        clientSockets.forEach((sid) => io.to(sid).emit('appointment_notification', payload));
      }
      io.emit('appointment_updated', { appointmentId: populated._id.toString(), action: 'created', appointment: populated });
      io.emit('stats_updated', { reason: 'appointment_created' });
    } catch (e) {
      // ignore socket errors
    }

    // email notification to lawyer on new booking (best-effort)
    try {
      const lawyerEmail = populated?.lawyer?.email;
      if (lawyerEmail) {
        const lawyerName = populated?.lawyer?.name || 'Lawyer';
        const clientName = populated?.client?.name || 'A client';
        const subject = 'New appointment request on CaseMate';
        const message = `Hi ${lawyerName},\n\n${clientName} has booked an appointment with you for ${new Date(populated.date).toLocaleDateString()} at ${populated.timeSlot}.\n\nPlease review and accept/reject the request from your dashboard.`;
        await sendEmailNotification(lawyerEmail, subject, message);
      }
    } catch (e) {
      // ignore email errors
    }

    res.status(201).json({ success: true, appointment: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    // lawyers must be verified by admin to access appointments
    if (req.user.role === 'lawyer' && req.user.isVerified !== true) {
      return res.status(403).json({ success: false, message: 'Lawyer account must be verified by admin to access appointments' });
    }
    const query = req.user.role === 'lawyer' ? { lawyer: req.user.id } : { client: req.user.id };
    const appointments = await Appointment.find(query)
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ date: 1 });
    // attach any chat unread flags for convenience
    const withChats = await Promise.all(appointments.map(async (apt) => {
      const chat = await Chat.findOne({ appointment: apt._id }).select('unreadForLawyer unreadForClient');
      const a = apt.toObject();
      a.chat = chat ? chat.toObject() : null;
      return a;
    }));
    res.json({ success: true, appointments: withChats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    // if requester is a lawyer, ensure they are verified by admin
    if (req.user.role === 'lawyer' && req.user.isVerified !== true) {
      return res.status(403).json({ success: false, message: 'Lawyer account must be verified by admin to access this appointment' });
    }
    const isClient = appointment.client._id.toString() === req.user.id.toString();
    const isLawyer = appointment.lawyer._id.toString() === req.user.id.toString();
    if (!isClient && !isLawyer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    // ensure lawyer is verified before allowing status updates
    if (req.user.role === 'lawyer' && req.user.isVerified !== true) {
      return res.status(403).json({ success: false, message: 'Lawyer account must be verified by admin to update appointment status' });
    }
    if (appointment.lawyer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the lawyer can update status' });
    }
    const { status } = req.body;
    if (['accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
      // only allow accept if lawyer has reviewed the case/docs
      if (status === 'accepted' && appointment.lawyerReviewed !== true) {
        return res.status(400).json({ success: false, message: 'You must mark the case as reviewed before accepting the appointment' });
      }
      appointment.status = status;
      await appointment.save();
    }
    const updated = await Appointment.findById(appointment._id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    // notify client when lawyer accepts or rejects
    try {
      if (['accepted', 'rejected'].includes(status)) {
        const io = getIO();
        const payload = { appointmentId: updated._id.toString(), body: `Your appointment was ${status}`, appointment: updated };
        io.to(`appointment_${updated._id}`).emit('appointment_notification', payload);
        const clientId = updated.client && updated.client._id ? updated.client._id.toString() : (updated.client ? updated.client.toString() : null);
        if (clientId) {
          const socketIds = getUserSocketIds(clientId) || [];
          socketIds.forEach((sid) => {
            io.to(sid).emit('appointment_notification', payload);
            io.to(sid).emit('user_notification', {
              type: 'appointment_status',
              title: 'Appointment Update',
              body: payload.body,
              appointmentId: payload.appointmentId,
              status,
            });
          });
        }
      }
      io.emit('appointment_updated', { appointmentId: updated._id.toString(), action: 'status_updated', appointment: updated });
      io.emit('stats_updated', { reason: 'appointment_status_updated' });
    } catch (e) {
      // ignore socket errors
    }

    // email notification to client on acceptance (best-effort)
    try {
      if (status === 'accepted') {
        const clientEmail = updated?.client?.email;
        if (clientEmail) {
          const clientName = updated?.client?.name || 'Client';
          const lawyerName = updated?.lawyer?.name || 'Your lawyer';
          const subject = 'Your appointment has been accepted';
          const message = `Hi ${clientName},\n\n${lawyerName} has accepted your appointment for ${new Date(updated.date).toLocaleDateString()} at ${updated.timeSlot}.\n\nYou can now open the chat in your dashboard.`;
          await sendEmailNotification(clientEmail, subject, message);
        }
      }
    } catch (e) {
      // ignore email errors
    }

    res.json({ success: true, appointment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadCaseDetails = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, client: req.user.id });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const { caseDetails, caseDocuments } = req.body;
    if (caseDetails !== undefined) appointment.caseDetails = caseDetails;
    if (Array.isArray(caseDocuments)) appointment.caseDocuments = caseDocuments;
    await appointment.save();
    const updated = await Appointment.findById(appointment._id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    res.json({ success: true, appointment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadCaseFile = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, client: req.user.id });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    // optional caseDetails text
    if (req.body.caseDetails !== undefined) appointment.caseDetails = req.body.caseDetails;
    if (req.file) {
      // store public path so frontend can link to it
      const publicPath = `/uploads/documents/${req.file.filename}`;
      appointment.caseDocuments = appointment.caseDocuments || [];
      appointment.caseDocuments.push(publicPath);
    }
    await appointment.save();
    const updated = await Appointment.findById(appointment._id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    // notify assigned lawyer via socket if online
    try {
      const io = getIO();
      const payload = { appointmentId: appointment._id.toString(), document: appointment.caseDocuments.slice(-1)[0] };
      // emit to appointment room (if clients/lawyers joined it)
      io.to(`appointment_${appointment._id}`).emit('appointment_document', payload);
      // also emit directly to lawyer socket ids
      const lawyerId = appointment.lawyer?.toString ? appointment.lawyer.toString() : (appointment.lawyer && appointment.lawyer._id ? appointment.lawyer._id.toString() : null);
      if (lawyerId) {
        const socketIds = getUserSocketIds(lawyerId) || [];
        socketIds.forEach((sid) => io.to(sid).emit('appointment_document', payload));
      }
      io.emit('appointment_updated', { appointmentId: updated._id.toString(), action: 'document_uploaded', appointment: updated });
    } catch (e) {
      // ignore socket errors
    }
    res.json({ success: true, appointment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// upload a temporary document (used by clients before creating an appointment)
exports.uploadTempDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const publicPath = `/uploads/documents/${req.file.filename}`;
    res.json({ success: true, url: publicPath });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// mark an appointment as reviewed by the assigned lawyer
exports.markReviewed = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.lawyer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the assigned lawyer can mark reviewed' });
    }
    appointment.lawyerReviewed = true;
    appointment.lawyerReviewedAt = new Date();
    await appointment.save();
    const updated = await Appointment.findById(appointment._id)
      .populate('lawyer', 'name email')
      .populate('client', 'name email');
    res.json({ success: true, appointment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// allow client or lawyer to delete a completed paid appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const userId = req.user.id.toString();
    const isClient = appointment.client && appointment.client.toString() === userId;
    const isLawyer = appointment.lawyer && appointment.lawyer.toString() === userId;
    if (!(isClient || isLawyer || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this appointment' });
    }
    if (appointment.status !== 'completed' || appointment.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Only completed paid appointments can be deleted' });
    }
    // use deleteOne on model since remove may not exist on returned object
    await Appointment.deleteOne({ _id: appointment._id });
    try {
      const io = getIO();
      const payload = { appointmentId: appointment._id.toString() };
      io.to(`appointment_${appointment._id}`).emit('appointment_deleted', payload);
      const ids = [];
      if (appointment.client) ids.push(appointment.client.toString());
      if (appointment.lawyer) ids.push(appointment.lawyer.toString());
      ids.forEach((uid) => {
        const sockets = getUserSocketIds(uid) || [];
        sockets.forEach((sid) => io.to(sid).emit('appointment_deleted', payload));
      });
      io.emit('appointment_deleted', payload);
      io.emit('stats_updated', { reason: 'appointment_deleted' });
    } catch (e) {
      // ignore socket errors
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// get a document with authorization check (client or assigned lawyer only)
exports.getDocumentByAppointment = async (req, res) => {
  try {
    const path = require('path');
    const { appointmentId } = req.params;
    const requestedFilename = decodeURIComponent(req.params.filename || '');
    const safeFilename = path.basename(requestedFilename);
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    
    // Check if user is the client or assigned lawyer
    const isClient = appointment.client.toString() === req.user.id;
    const isLawyer = appointment.lawyer.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isClient && !isLawyer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this document' });
    }
    
    // Check if document belongs to this appointment
    if (!appointment.caseDocuments.includes(`/uploads/documents/${safeFilename}`)) {
      return res.status(404).json({ success: false, message: 'Document not found in this appointment' });
    }
    
    const filePath = path.join(__dirname, '../uploads/documents', safeFilename);
    res.setHeader('Cache-Control', 'no-store');
    res.download(filePath, safeFilename);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
