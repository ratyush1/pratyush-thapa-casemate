import React, { useState, useEffect } from 'react';
import api from '../api/axios';

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
    <div className="card overflow-hidden border-slate-700/50">
      <table className="w-full text-left">
        <thead className="bg-surface-800/80">
          <tr>
            <th className="p-4 text-slate-300 font-medium text-sm">Client</th>
            <th className="p-4 text-slate-300 font-medium text-sm">Lawyer</th>
            <th className="p-4 text-slate-300 font-medium text-sm">Date</th>
            <th className="p-4 text-slate-300 font-medium text-sm">Status</th>
            <th className="p-4 text-slate-300 font-medium text-sm">Payment</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((apt) => (
            <tr key={apt._id} className="border-t border-slate-800/80 hover:bg-white/[0.02] transition-colors">
              <td className="p-4 text-white font-medium">{apt.client?.name}</td>
              <td className="p-4 text-white font-medium">{apt.lawyer?.name}</td>
              <td className="p-4 text-slate-400">{new Date(apt.date).toLocaleString()}</td>
              <td className="p-4 text-slate-400 capitalize">{apt.status}</td>
              <td className="p-4 text-slate-400 capitalize">{apt.paymentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {appointments.length === 0 && <div className="p-8 text-center text-slate-500">No appointments.</div>}
    </div>
  );
}
