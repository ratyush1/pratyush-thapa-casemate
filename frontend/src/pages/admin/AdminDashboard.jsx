import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import api from '../../api/axios';
import AdminUsers from '../../components/AdminUsers';
import AdminLawyers from '../../components/AdminLawyers';
import AdminChats from '../../components/AdminChats';
import AdminAppointments from '../../components/AdminAppointments';
import AdminStats from '../../components/AdminStats';

export default function AdminDashboard() {
  const [unreadChats, setUnreadChats] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    api.get('/admin/chats').then(({ data }) => {
      if (!mounted) return;
      const count = (data.chats || []).filter((c) => c.unreadForLawyer || c.unreadForClient).length;
      setUnreadChats(count);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card-glass p-6 md:p-8 border-brand-500/15">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">Main admin</span>
        </div>
        <p className="text-slate-300 mt-2">Manage users, verify lawyers (check their documents), and monitor activity. Only one admin account exists.</p>
      </div>
      <nav className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-900/70 border border-slate-700/60">
        <NavLink to="/admin" end className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          Stats
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          Users
        </NavLink>
        <NavLink to="/admin/lawyers" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          Lawyers
        </NavLink>
        <NavLink to="/admin/chats" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          Chats
          {unreadChats > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white">{unreadChats}</span>
          )}
        </NavLink>
        <NavLink to="/admin/appointments" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          Appointments
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<AdminStats />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="lawyers" element={<AdminLawyers />} />
        <Route path="chats" element={<AdminChats />} />
        <Route path="appointments" element={<AdminAppointments />} />
      </Routes>
    </div>
  );
}
