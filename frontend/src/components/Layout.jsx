import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import Footer from './Footer';
import { getAssetUrl } from '../utils/media';

export default function Layout() {
  const { user, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = user?.role === 'client' ? '/dashboard' : user?.role === 'lawyer' ? '/lawyer' : '/admin';
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState(null);
  const avatarUrl = getAssetUrl(user?.avatar) || '/favicon.svg';

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetch = async () => {
      try {
        if (user.role === 'lawyer') {
          const { data } = await api.get('/appointments');
          const count = (data.appointments || []).filter((a) => a.chat?.unreadForLawyer).length;
          if (mounted) setUnreadCount(count);
        }
      } catch (e) {
        // ignore
      }
    };
    fetch();

    // realtime notifications via socket
    try {
      const socket = io((import.meta.env.VITE_API_URL || '').replace(/\/\/$/, '') || undefined, { path: '/socket.io', auth: { token: localStorage.getItem('token') } });
      const emitRealtime = (type, payload) => {
        try {
          window.dispatchEvent(new CustomEvent('casemate:realtime', { detail: { type, payload } }));
        } catch (e) {
          // ignore browser event errors
        }
      };
      socket.on('connect', () => {});
      socket.on('appointment_notification', (payload) => {
        emitRealtime('appointment_notification', payload);
        if (user.role === 'lawyer') setUnreadCount((c) => c + 1);

        if (user.role === 'client' && payload) {
          const body = payload.body || 'Your appointment has been updated.';
          setNotification({
            title: 'Appointment Update',
            body,
          });
          setTimeout(() => setNotification(null), 7000);
        }
      });
      socket.on('user_notification', (payload) => {
        emitRealtime('user_notification', payload);
        if (!payload) return;
        setNotification(payload);
        setTimeout(() => setNotification(null), 7000);
      });
      socket.on('user_updated', async (payload) => {
        emitRealtime('user_updated', payload);
        try {
          if (payload?.userId && user?.id && String(payload.userId) === String(user.id)) {
            await refreshMe();
          }
        } catch (e) {
          // ignore refresh errors
        }
      });
      socket.on('lawyer_updated', (payload) => emitRealtime('lawyer_updated', payload));
      socket.on('appointment_message', (payload) => emitRealtime('appointment_message', payload));
      socket.on('appointment_document', (payload) => emitRealtime('appointment_document', payload));
      socket.on('appointment_updated', (payload) => emitRealtime('appointment_updated', payload));
      socket.on('appointment_deleted', (payload) => emitRealtime('appointment_deleted', payload));
      socket.on('payment_updated', (payload) => emitRealtime('payment_updated', payload));
      socket.on('stats_updated', (payload) => emitRealtime('stats_updated', payload));
      return () => { mounted = false; try { socket.disconnect(); } catch (e) {} };
    } catch (e) {
      return () => { mounted = false };
    }
  }, [user, refreshMe]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 bg-gradient-mesh text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-surface-950/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(2,6,23,0.35)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <NavLink to={dashboardPath} className="flex items-center gap-3">
              <img src="/logo.svg" alt="CaseMate" className="w-24 h-auto" />
            </NavLink>
            {user?.role !== 'lawyer' && (
              <div className="hidden md:flex items-center bg-surface-900/60 border border-slate-800/60 rounded-full px-3 py-1 gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35"/></svg>
                <input className="bg-transparent outline-none text-sm placeholder:text-slate-500" placeholder="Search lawyers, cases..." />
              </div>
            )}
          </div>
          <nav className="flex items-center gap-3">
            <NavLink to={dashboardPath} className={({ isActive }) => `px-4 py-2 rounded-full text-sm font-medium transition ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20' : 'text-slate-300 hover:bg-white/5'}`}>
              Dashboard
            </NavLink>
            {unreadCount > 0 && user?.role === 'lawyer' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white">{unreadCount}</span>
            )}
            <div className="mx-2 h-6 w-px bg-slate-700" aria-hidden />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right mr-2">
                <span className="text-sm text-slate-200">Welcome</span>
                <span className="text-sm font-semibold text-white truncate max-w-[160px]">{user?.name}</span>
              </div>
              <div className="text-xs text-slate-400 hidden sm:block capitalize">{user?.role}</div>
              <div className="w-10 h-10 rounded-full bg-surface-800 border border-slate-600/70 overflow-hidden shadow-lg shadow-black/30">
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <button type="button" onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm text-slate-300">
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>
      {notification && (
        <div className="fixed right-6 top-20 z-50 max-w-sm">
          <div className="card p-4 bg-surface-900/95 border-slate-700/60 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{notification.title || 'Notification'}</div>
                <div className="text-xs text-slate-400 mt-1">{notification.body}</div>
              </div>
              <button type="button" onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
