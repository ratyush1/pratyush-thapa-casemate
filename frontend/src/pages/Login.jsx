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

  const navigateByRole = (role) => {
    const path = role === 'lawyer' ? '/lawyer' : role === 'admin' ? '/admin' : '/dashboard';
    navigate(path);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      navigateByRole(data.user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check email/password or run the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950 bg-gradient-auth">
      <div className="max-w-7xl w-full grid gap-6 lg:grid-cols-[0.95fr_0.75fr] items-stretch">
        <div className="card-glass hidden lg:flex flex-col justify-between p-8 xl:p-10 border-brand-500/15 animate-slide-up overflow-hidden relative">
          <div className="absolute -top-10 right-0 h-48 w-48 rounded-full bg-brand-400/10 blur-3xl" />
          <div>
            <p className="chip border-cyan-400/40 bg-cyan-400/10 text-cyan-200">Client, lawyer, and admin workspace</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] text-white max-w-xl">Keep every legal conversation, booking, and document in one place.</h1>
            <p className="mt-4 max-w-lg text-slate-300 leading-relaxed">CaseMate gives clients clearer next steps and gives legal professionals a cleaner way to manage appointments and case context.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-700/70 bg-surface-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fast intake</p>
              <p className="mt-2 text-white font-semibold">AI-guided case summary and lawyer matching</p>
            </div>
            <div className="rounded-[24px] border border-slate-700/70 bg-surface-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secure workflow</p>
              <p className="mt-2 text-white font-semibold">Chat, files, payments, and updates in one timeline</p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-[560px] mx-auto animate-slide-up">
          <div className="card-glass p-8 md:p-10 border-brand-500/15">
            <div className="text-center mb-8">
              <img src="/logo.svg" alt="CaseMate" className="w-24 h-auto mx-auto mb-3" />
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Welcome back</h1>
              <p className="text-slate-400 mt-1.5 text-sm">Sign in to continue to your legal workspace.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
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
                className="btn-primary w-full text-base"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div className="my-6 subtle-divider" />
            <p className="text-center text-slate-400 text-sm">
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
