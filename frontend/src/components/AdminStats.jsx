import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = () => {
      api.get('/admin/stats').then(({ data }) => {
        setStats(data.stats);
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      if (['stats_updated', 'payment_updated', 'appointment_updated', 'appointment_deleted', 'user_updated', 'lawyer_updated'].includes(type)) {
        fetchStats();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchStats();
    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, []);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: 'Total users', value: stats.users },
    { label: 'Lawyers', value: stats.lawyers },
    { label: 'Appointments', value: stats.appointments },
    { label: 'Payments', value: stats.payments },
    { label: 'Chats', value: stats.chats },
    { label: 'Revenue (NPR)', value: Number(stats.revenue).toFixed(2) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="card-interactive p-5">
          <p className="text-slate-400 text-sm font-medium">{c.label}</p>
          <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
