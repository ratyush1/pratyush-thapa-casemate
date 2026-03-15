import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';
import AppointmentChat from './AppointmentChat';

const getStatusBadge = (status) => {
  if (status === 'accepted' || status === 'completed') return 'badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge-danger';
  return 'badge-warning';
};

export default function LawyerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get('/appointments').then(({ data }) => {
      setAppointments(data.appointments || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    try {
      const socket = io((import.meta.env.VITE_API_URL || '').replace(/\/\/$/, '') || undefined, {
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: { token: localStorage.getItem('token') },
      });
      socketRef.current = socket;
      socket.on('connect', () => console.log('✅ Lawyer socket connected'));
      socket.on('appointment_message', (payload) => {
        try {
          const chat = payload?.chat;
          if (!chat || !chat.appointment) return;
          setAppointments((list) => list.map((a) => (a._id === chat.appointment.toString() ? { ...a, chat } : a)));
        } catch (e) { console.error(e); }
      });
      socket.on('appointment_notification', (payload) => {
        try {
          const aptId = payload?.appointmentId;
          const newAppointment = payload?.appointment;
          if (!aptId) return;
          
          setAppointments((list) => {
            const exists = list.some((a) => a._id === aptId);
            if (!exists && newAppointment) {
              console.log('📌 New appointment received:', newAppointment);
              return [newAppointment, ...list];
            } else if (exists) {
              return list.map((a) => (a._id === aptId ? { ...a, chat: { ...(a.chat || {}), unreadForLawyer: true } } : a));
            }
            return list;
          });
        } catch (e) { console.error(e); }
      });
      socket.on('appointment_document', (payload) => {
        try {
          const aptId = payload?.appointmentId;
          const doc = payload?.document;
          if (!aptId || !doc) return;
          setAppointments((list) => list.map((a) => (a._id === aptId ? { ...a, caseDocuments: [...(a.caseDocuments || []), doc] } : a)));
        } catch (e) { console.error(e); }
      });
      socket.on('appointment_deleted', (payload) => {
        try {
          const aptId = payload?.appointmentId;
          if (!aptId) return;
          setAppointments((list) => list.filter((a) => a._id !== aptId));
          if (activeChat && activeChat._id === aptId) setActiveChat(null);
        } catch (e) { console.error(e); }
      });
    } catch (e) {}
    return () => { try { socketRef.current?.disconnect(); } catch (e) {} };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/appointments/${id}/status`, { status });
      setAppointments((list) => list.map((a) => (a._id === id ? data.appointment : a)));
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed');
    }
  };

  const markReviewed = async (id) => {
    try {
      const { data } = await api.patch(`/appointments/${id}/review`);
      setAppointments((list) => list.map((a) => (a._id === id ? data.appointment : a)));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to mark reviewed');
    }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments((list) => list.filter((a) => a._id !== id));
      if (activeChat && activeChat._id === id) setActiveChat(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  const downloadDocument = async (appointmentId, doc, index) => {
    try {
      const rawDoc = typeof doc === 'string' ? doc : (doc?.url || '');
      const fileName = rawDoc ? rawDoc.split('/').pop() : '';
      if (!fileName) {
        alert('Document not found');
        return;
      }
      const base = api.defaults.baseURL || '/api';
      const endpoint = `${base}/appointments/${appointmentId}/document/${encodeURIComponent(fileName)}`;
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        let message = 'Failed to download document';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch (e) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = decodeURIComponent(fileName) || `document-${index + 1}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Failed to download document');
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return <div className="card p-8 text-center text-slate-500">No appointments yet.</div>;
  }

  return (
    <div className="grid gap-4">
      {appointments.map((apt) => (
        <div key={apt._id} className="metric-card relative">
          {!apt.lawyerReviewed && apt.status === 'pending' && (
            <div className="absolute top-3 right-3 bg-amber-500 rounded-full w-3 h-3 animate-pulse" title="New appointment" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{apt.client?.name}</p>
            <span className={getStatusBadge(apt.status)}>{apt.status}</span>
            {apt.chat?.unreadForLawyer && <span className="badge-danger">New message</span>}
          </div>
          <p className="text-slate-500 text-sm">{apt.client?.email}</p>
          <p className="text-slate-400 text-sm mt-1">
            {new Date(apt.date).toLocaleDateString()} · {apt.timeSlot} · NPR {apt.amount}
          </p>
          {apt.caseDetails && (
            <div className="mt-3 p-3 bg-surface-800/50 rounded-2xl text-slate-300 text-sm border border-slate-700/50">{apt.caseDetails}</div>
          )}
          {apt.caseDocuments && apt.caseDocuments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {apt.caseDocuments.map((doc, i) => {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => downloadDocument(apt._id, doc, i)}
                    className="badge-neutral hover:text-white"
                  >
                    Document {i + 1}
                  </button>
                );
              })}
            </div>
          )}
          {apt.status === 'pending' && (
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => updateStatus(apt._id, 'accepted')}
                className={`btn-primary text-sm rounded-xl ${!apt.lawyerReviewed ? 'opacity-50 pointer-events-none' : ''}`}
                title={!apt.lawyerReviewed ? 'Mark reviewed before accepting' : 'Accept appointment'}
              >
                Accept
              </button>
              <button type="button" onClick={() => updateStatus(apt._id, 'rejected')} className="btn-secondary text-sm rounded-xl">
                Reject
              </button>
            </div>
          )}
          {apt.status === 'pending' && !apt.lawyerReviewed && (
            <div className="mt-3">
              <button type="button" onClick={() => markReviewed(apt._id)} className="btn-ghost text-sm rounded-xl">
                Mark Reviewed (I have read the case & documents)
              </button>
            </div>
          )}
          {apt.status === 'accepted' && (
            <button type="button" onClick={() => updateStatus(apt._id, 'completed')} className="btn-secondary text-sm mt-3 rounded-xl">
              Mark completed
            </button>
          )}
          <div className="mt-3 flex gap-2">
            {apt.status === 'accepted' ? (
              <button type="button" onClick={() => setActiveChat(apt)} className="btn-secondary text-sm rounded-xl">
                Open chat
              </button>
            ) : (
              <div className="text-sm text-slate-500">Chat available after acceptance</div>
            )}
            {(apt.status === 'completed' && apt.paymentStatus === 'paid') && (
              <button type="button" onClick={() => deleteAppointment(apt._id)} className="btn-danger text-sm rounded-xl">
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      {activeChat && (
        <AppointmentChat appointment={activeChat} onClose={() => setActiveChat(null)} />
      )}
    </div>
  );
}
