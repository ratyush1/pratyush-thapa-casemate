import React, { useState, useEffect } from 'react';
import api from '../api/axios';

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

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = () => {
      api.get('/admin/appointments').then(({ data }) => {
        setAppointments(data.appointments || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      if (type === 'appointment_updated' || type === 'appointment_deleted' || type === 'appointment_notification') {
        fetchAppointments();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchAppointments();
    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, []);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Appointment tracking</p>
        <h2 className="mt-2 section-title">Bookings</h2>
      </div>
      <div className="table-shell">
        <div className="table-wrap">
          <table className="table-base">
        <thead className="table-head">
          <tr>
            <th>Client</th>
            <th>Lawyer</th>
            <th>Date</th>
            <th>Status</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((apt) => (
            <tr key={apt._id} className="table-row">
              <td className="font-semibold text-white">{apt.client?.name}</td>
              <td className="font-semibold text-white">{apt.lawyer?.name}</td>
              <td className="text-slate-400">{new Date(apt.date).toLocaleString()}</td>
              <td><span className={getStatusBadge(apt.status)}>{apt.status}</span></td>
              <td><span className={getPaymentBadge(apt.paymentStatus)}>{apt.paymentStatus}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      {appointments.length === 0 && <div className="p-8 text-center text-slate-500">No appointments.</div>}
      </div>
    </div>
  );
}
