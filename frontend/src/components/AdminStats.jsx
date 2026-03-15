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
    { label: 'Total users', value: stats.users, tone: 'info', note: 'Clients, lawyers, and admin accounts' },
    { label: 'Lawyers', value: stats.lawyers, tone: 'success', note: 'Professionals available for booking' },
    { label: 'Appointments', value: stats.appointments, tone: 'warning', note: 'All requests and completed sessions' },
    { label: 'Payments', value: stats.payments, tone: 'info', note: 'Tracked payment records' },
    { label: 'Chats', value: stats.chats, tone: 'success', note: 'Conversation timelines created' },
    { label: 'Revenue (NPR)', value: Number(stats.revenue).toFixed(2), tone: 'warning', note: 'Completed payment volume' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platform overview</p>
          <h2 className="mt-2 section-title">Key platform metrics</h2>
        </div>
        <span className="badge-neutral">Live refresh enabled</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="metric-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-400">{c.label}</p>
            <span className={c.tone === 'success' ? 'badge-success' : c.tone === 'warning' ? 'badge-warning' : 'badge-info'}>
              {c.tone}
            </span>
          </div>
          <p className="kpi-value">{c.value}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{c.note}</p>
        </div>
      ))}
      </div>
    </div>
  );
}
