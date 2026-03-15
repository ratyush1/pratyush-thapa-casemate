import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
      const path = data.user.role === 'lawyer' ? '/lawyer' : '/dashboard';
      navigate(path);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950 bg-gradient-auth">
      <div className="w-full max-w-[520px] animate-slide-up">
        <div className="card-glass p-8 md:p-10 border-brand-500/15">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="CaseMate" className="w-24 h-auto mx-auto mb-3" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Create your account</h1>
            <p className="text-slate-400 mt-1.5 text-sm">Start with a client or lawyer workspace.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="reg-name" className="label">Full name</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                placeholder="Jane Doe"
                className="input"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="label">Email</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className="input"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="label">Password (min 6 characters)</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                placeholder="••••••••"
                className="input"
                value={form.password}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="label">Phone (optional)</label>
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                placeholder="+1 234 567 8900"
                className="input"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="reg-role" className="label">I am a</label>
              <select id="reg-role" name="role" className="input" value={form.role} onChange={handleChange}>
                <option value="client">Client</option>
                <option value="lawyer">Lawyer</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn-primary w-full text-base mt-2"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <div className="my-6 subtle-divider" />
          <p className="text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="link font-medium text-brand-400">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
