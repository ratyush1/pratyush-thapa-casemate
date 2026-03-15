import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import ClientDashboard from './pages/client/ClientDashboard';
import LawyerDashboard from './pages/lawyer/LawyerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LawyerProfileView from './pages/LawyerProfileView';

function DashboardRedirect() {
  const { user } = useAuth();
  const to = !user ? '/' : user.role === 'lawyer' ? '/lawyer' : user.role === 'admin' ? '/admin' : '/dashboard';
  return <Navigate to={to} replace />;
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-glass w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-brand-500/15 border border-brand-400/20" />
          <p className="font-display text-xl text-white">Loading workspace</p>
          <p className="mt-2 text-sm text-slate-400">Preparing your dashboard and syncing your account.</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
        <Route path="lawyer/*" element={<PrivateRoute roles={['lawyer']}><LawyerDashboard /></PrivateRoute>} />
        <Route path="admin/*" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
      </Route>
      <Route path="/lawyers/:id" element={<LawyerProfileView />} />
      <Route path="*" element={<DashboardRedirect />} />
    </Routes>
  );
}
