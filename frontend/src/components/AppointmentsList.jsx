import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import AppointmentChat from './AppointmentChat';
import { io } from 'socket.io-client';

const getStatusBadge = (status) => {
  if (status === 'accepted' || status === 'completed') return 'badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge-danger';
  return 'badge-warning';
};

const getPaymentBadge = (status) => {
  if (status === 'paid') return 'badge-success';
  if (status === 'refunded') return 'badge-danger';
  return 'badge-warning';
};

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingAppointmentId, setPayingAppointmentId] = useState(null);
  const socketRef = useRef(null);
  const [activeChat, setActiveChat] = useState(null);
  const [uploadingApt, setUploadingApt] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const openPaymentReceipt = (payment, appointment) => {
    if (!payment) return;

    const receiptId = payment?.metadata?.receiptId || `RCPT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
    const paidAt = payment?.metadata?.paidAt || payment?.updatedAt || new Date().toISOString();
    const lawyerName = appointment?.lawyer?.name || 'N/A';
    const appointmentDate = appointment?.date ? new Date(appointment.date).toLocaleString() : 'N/A';
    const amount = Number(payment?.amount || appointment?.amount || 0).toFixed(2);
    const transactionId = payment?.transactionId || 'N/A';
    const customer = appointment?.client?.name || 'Client';

    const popup = window.open('', '_blank', 'width=820,height=900');
    if (!popup) {
      alert(`Payment successful. Receipt ID: ${receiptId}`);
      return;
    }

    popup.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CaseMate Payment Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
      .wrap { max-width: 700px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      .muted { color: #6b7280; margin-bottom: 20px; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
      .row:last-child { border-bottom: none; }
      .k { font-weight: 600; }
      .amount { font-size: 22px; font-weight: 700; color: #0f766e; }
      .actions { margin-top: 20px; }
      button { padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: #fff; cursor: pointer; }
      @media print { .actions { display: none; } body { margin: 0; } .wrap { border: none; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Payment Receipt</h1>
      <div class="muted">CaseMate - eSewa Sandbox Payment</div>
      <div class="row"><div class="k">Receipt ID</div><div>${receiptId}</div></div>
      <div class="row"><div class="k">Transaction ID</div><div>${transactionId}</div></div>
      <div class="row"><div class="k">Payment Method</div><div>eSewa</div></div>
      <div class="row"><div class="k">Paid By</div><div>${customer}</div></div>
      <div class="row"><div class="k">Lawyer</div><div>${lawyerName}</div></div>
      <div class="row"><div class="k">Appointment Date</div><div>${appointmentDate}</div></div>
      <div class="row"><div class="k">Paid At</div><div>${new Date(paidAt).toLocaleString()}</div></div>
      <div class="row"><div class="k">Status</div><div>Completed</div></div>
      <div class="row"><div class="k">Amount</div><div class="amount">NPR ${amount}</div></div>
      <div class="actions"><button onclick="window.print()">Print Receipt</button></div>
    </div>
  </body>
</html>`);
    popup.document.close();
  };

  useEffect(() => {
    api.get('/appointments').then(({ data }) => {
      setAppointments(data.appointments || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    // realtime socket to update appointment list when chat messages arrive
    try {
      const socket = io((import.meta.env.VITE_API_URL || '').replace(/\/\/$/, '') || undefined, {
        path: '/socket.io',
        auth: { token: localStorage.getItem('token') },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;
      socket.on('connect', () => console.log('✅ Client socket connected'));
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
          const newApt = payload?.appointment;
          if (!aptId) return;
          // If we have the full appointment object, update with it (new booking or status change)
          if (newApt) {
            setAppointments((list) => {
              const exists = list.some((a) => a._id === aptId);
              if (!exists) {
                console.log('📌 New appointment received:', newApt);
                return [newApt, ...list];
              } else {
                return list.map((a) => (a._id === aptId ? newApt : a));
              }
            });
          } else {
            // Fallback: just mark the message as unread if we don't have the full appointment
            setAppointments((list) => list.map((a) => (a._id === aptId ? { ...a, chat: { ...(a.chat || {}), unreadForClient: true } } : a)));
          }
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

  const submitEsewaForm = (action, fields) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    Object.entries(fields || {}).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value ?? '');
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  const pay = async (apt) => {
    try {
      setPayingAppointmentId(apt._id);
      const { data } = await api.post('/payments/esewa/initiate', { appointmentId: apt._id });
      if (data?.bypass) {
        const refreshed = await api.get('/appointments');
        setAppointments(refreshed.data?.appointments || []);
        alert('Payment completed (sandbox bypass mode).');
        return;
      }
      if (!data?.esewa?.action || !data?.esewa?.fields) {
        throw new Error('Invalid eSewa initiation response');
      }
      submitEsewaForm(data?.esewa?.action, data?.esewa?.fields);
    } catch (e) {
      alert(e.response?.data?.message || 'Payment failed');
    } finally {
      setPayingAppointmentId(null);
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

  const uploadDocument = async (aptId) => {
    if (!uploadFile) return alert('Please select a file');
    setUploadLoading(true);
    try {
      const form = new FormData();
      form.append('document', uploadFile);
      await api.post(`/appointments/${aptId}/case/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadFile(null);
      setUploadingApt(null);
      // Refresh appointments to see new document
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments || []);
    } catch (e) {
      alert(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading appointments...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500">No appointments yet. Book a lawyer from the Find Lawyers tab.</p>
        <p className="text-slate-600 text-sm mt-2">Updates appear in real-time!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {appointments.map((apt) => (
        <div key={apt._id} className="metric-card flex flex-wrap justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-white">{apt.lawyer?.name}</p>
              <span className={getStatusBadge(apt.status)}>{apt.status}</span>
              <span className={getPaymentBadge(apt.paymentStatus)}>{apt.paymentStatus}</span>
            </div>
            <p className="text-slate-400 text-sm mt-1.5">
              {new Date(apt.date).toLocaleDateString()} · {apt.timeSlot} · NPR {apt.amount}
            </p>
            {apt.caseDetails && <p className="text-slate-500 text-sm mt-2 line-clamp-2">{apt.caseDetails}</p>}
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
            {uploadingApt === apt._id && (
              <div className="mt-4 rounded-[22px] border border-slate-700/60 bg-white/[0.03] p-4 space-y-3">
                <input 
                  type="file" 
                  accept="application/pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="file-input"
                />
                {uploadFile && <p className="text-sm text-slate-400">Selected: {uploadFile.name}</p>}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => uploadDocument(apt._id)}
                    disabled={uploadLoading || !uploadFile}
                    className="btn-primary text-sm rounded-xl"
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setUploadingApt(null); setUploadFile(null); }}
                    className="btn-secondary text-sm rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {uploadingApt !== apt._id && (
              <button 
                type="button"
                onClick={() => setUploadingApt(apt._id)}
                className="mt-3 badge-info"
              >
                Add document
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {apt.paymentStatus === 'pending' && apt.status !== 'rejected' && apt.status !== 'cancelled' && (
              <button type="button" onClick={() => pay(apt)} className="btn-primary rounded-xl text-sm shrink-0" disabled={payingAppointmentId === apt._id}>
                {payingAppointmentId === apt._id ? 'Redirecting...' : 'Pay with eSewa'}
              </button>
            )}
            {apt.status === 'accepted' ? (
              <button type="button" onClick={() => setActiveChat(apt)} className="btn-secondary rounded-xl text-sm">
                Open chat
              </button>
            ) : (
              <div className="text-sm text-slate-500">Chat available after acceptance</div>
            )}
            {(apt.status === 'completed' && apt.paymentStatus === 'paid') && (
              <button type="button" onClick={() => deleteAppointment(apt._id)} className="btn-danger rounded-xl text-sm">
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
