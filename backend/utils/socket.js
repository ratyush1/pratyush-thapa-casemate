let ioInstance = null;
const jwt = require('jsonwebtoken');

// Map of userId -> Set of socketIds
const onlineUsers = new Map();

function init(server, options = {}) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, options);

  ioInstance.on('connection', (socket) => {
    // try to read JWT from socket auth (client should provide token)
    try {
      const token = socket.handshake?.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          socket.userId = decoded.id;
          const set = onlineUsers.get(decoded.id) || new Set();
          set.add(socket.id);
          onlineUsers.set(decoded.id, set);
        }
      }
    } catch (e) {
      // ignore auth errors for sockets (we still allow unauth'd sockets)
    }

    socket.on('joinAppointment', async (appointmentId) => {
      try {
        // Restrict joining to the appointment's client or lawyer and only if appointment is accepted
        if (!socket.userId) return;
        const Appointment = require('../models/Appointment');
        const appt = await Appointment.findById(appointmentId).select('client lawyer status');
        if (!appt) return;
        const isClient = appt.client && appt.client.toString() === socket.userId;
        const isLawyer = appt.lawyer && appt.lawyer.toString() === socket.userId;
        if (!isClient && !isLawyer) return;
        if (appt.status !== 'accepted') return; // only allow when accepted
        socket.join(`appointment_${appointmentId}`);
      } catch (e) {
        // ignore
      }
    });
    socket.on('leaveAppointment', (appointmentId) => {
      try {
        socket.leave(`appointment_${appointmentId}`);
      } catch (e) {}
    });
    // WebRTC signaling: forward offers/answers/candidates to other peers in the appointment room
    socket.on('webrtc:offer', ({ appointmentId, offer }) => {
      try {
        socket.to(`appointment_${appointmentId}`).emit('webrtc:offer', { offer, from: socket.id });
      } catch (e) {}
    });
    socket.on('webrtc:answer', ({ appointmentId, answer }) => {
      try {
        socket.to(`appointment_${appointmentId}`).emit('webrtc:answer', { answer, from: socket.id });
      } catch (e) {}
    });
    socket.on('webrtc:ice-candidate', ({ appointmentId, candidate }) => {
      try {
        socket.to(`appointment_${appointmentId}`).emit('webrtc:ice-candidate', { candidate, from: socket.id });
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      try {
        if (socket.userId) {
          const set = onlineUsers.get(socket.userId);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) onlineUsers.delete(socket.userId);
          }
        }
      } catch (e) {}
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

function getUserSocketIds(userId) {
  const set = onlineUsers.get(userId);
  return set ? Array.from(set) : [];
}

function isUserOnline(userId) {
  const set = onlineUsers.get(userId);
  return !!(set && set.size > 0);
}

module.exports = { init, getIO, getUserSocketIds, isUserOnline };
