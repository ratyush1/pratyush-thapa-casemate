import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const path = data.user.role === 'lawyer' ? '/lawyer' : data.user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(path);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check email/password or run the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-surface-950 bg-gradient-auth">
      <div className="max-w-6xl w-full">
        <div className="w-full max-w-[520px] mx-auto animate-slide-up">
          <div className="card-glass p-8 md:p-10 border-brand-500/15">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="CaseMate" className="w-24 h-auto mx-auto mb-3" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">CaseMate</h1>
            <p className="text-slate-400 mt-1.5 text-sm">Sign in to your account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-3 rounded-xl text-base font-semibold"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="link font-medium text-brand-400">Register</Link>
          </p>
          <p className="mt-3 text-center text-slate-500 text-xs">
            Admin: single main admin account only (cannot register as admin).
          </p>
        </div>
      </div>
    </div>
  </div>
  );
}
