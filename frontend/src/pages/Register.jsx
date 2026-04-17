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
      <div className="max-w-7xl w-full grid gap-6 lg:grid-cols-[1.08fr_0.92fr] items-stretch">
        <div className="card-glass hidden lg:flex flex-col p-7 xl:p-8 border-brand-500/20 animate-slide-up overflow-hidden relative">
          <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative z-10 mb-5">
            <p className="chip border-cyan-400/40 bg-cyan-400/10 text-cyan-200">Quick onboarding</p>
            <h1 className="mt-4 font-display text-3xl xl:text-4xl leading-tight text-white">Create your account</h1>
          </div>
          <div className="relative z-10 rounded-[24px] border border-slate-700/70 bg-surface-900/50 p-2 h-[430px] xl:h-[500px]">
            <img
              src="/reg.png"
              alt="Register workspace preview"
              className="w-full h-full rounded-[18px] object-cover object-top"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-[18px] bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent p-4">
              <div className="flex items-center gap-2">
                <span className="badge-info">Verified</span>
                <span className="badge-success">Fast setup</span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-[560px] mx-auto animate-slide-up">
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
    </div>
  );
}
