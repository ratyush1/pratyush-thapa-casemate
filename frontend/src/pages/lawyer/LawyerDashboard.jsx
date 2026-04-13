import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import LawyerProfileEdit from '../../components/LawyerProfileEdit';
import LawyerProfilePage from './LawyerProfilePage';
import LawyerAppointments from '../../components/LawyerAppointments';
import LawyerDocuments from '../../components/LawyerDocuments';
import { useAuth } from '../../context/AuthContext';
import { getAssetUrl } from '../../utils/media';

export default function LawyerDashboard() {
  const { user } = useAuth();
  const avatar = getAssetUrl(user?.avatar) || '/favicon.svg';

  return (
    <div className="page-shell animate-fade-in">
      <div className="dashboard-hero">
        <div className="absolute -top-14 -right-10 w-52 h-52 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="hero-grid">
          <div className="flex items-center gap-4">
            <img src={avatar} alt="Lawyer avatar" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" />
            <div>
              <p className="chip mb-2">Lawyer workspace</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">Welcome, {user?.name || 'Lawyer'}</h1>
              <p className="text-slate-300 mt-1">Manage appointments, review client documents, and keep your profile up to date.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap lg:justify-end">
            <span className="badge-info">Appointments</span>
            <span className="badge-success">Client docs</span>
            <img src="/illustration-lawyer.svg" alt="Lawyer illustration" className="w-44 h-28 object-contain opacity-90" />
          </div>
        </div>
      </div>
      <nav className="tabs-shell w-fit">
        <NavLink to="/lawyer" end className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Appointments
        </NavLink>
        <NavLink to="/lawyer/documents" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Private Docs
        </NavLink>
        <NavLink to="/lawyer/profile" className={({ isActive }) => `tab-pill ${isActive ? 'tab-pill-active' : ''}`}>
          Profile
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<LawyerAppointments />} />
        <Route path="documents" element={<LawyerDocuments />} />
        <Route path="profile" element={<LawyerProfilePage />} />
        <Route path="profile/edit" element={<LawyerProfileEdit />} />
      </Routes>
    </div>
  );
}
