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
    <div className="page-shell animate-fade-in">
      <div className="dashboard-hero">
        <div className="hero-grid">
          <div>
            <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
              <span className="badge-warning">Main admin</span>
            </div>
            <p className="text-slate-300 mt-2 max-w-2xl">Manage users, verify lawyers, monitor activity, and keep platform operations clean and readable from one control center.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap lg:justify-end">
            <span className="badge-info">Platform health</span>
            {unreadChats > 0 && <span className="badge-danger">{unreadChats} unread chats</span>}
          </div>
        </div>
      </div>
      <nav className="tabs-shell">
        <NavLink to="/admin" end className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Stats
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Users
        </NavLink>
        <NavLink to="/admin/lawyers" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Lawyers
        </NavLink>
        <NavLink to="/admin/chats" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Chats
          {unreadChats > 0 && (
            <span className="ml-2 badge-danger">{unreadChats}</span>
          )}
        </NavLink>
        <NavLink to="/admin/appointments" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
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
