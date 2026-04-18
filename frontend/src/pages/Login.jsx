import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotStep, setForgotStep] = useState('request');
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

  const toggleForgotPassword = () => {
    setShowForgotPassword((prev) => !prev);
    setForgotError('');
    setForgotSuccess('');
    if (!showForgotPassword) {
      setForgotEmail(email || '');
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const { data } = await api.post('/auth/forgot-password/request', { email: forgotEmail });
      setForgotStep('verify');
      setForgotSuccess(data.message || 'OTP sent. Please check your email inbox.');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Could not send OTP. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    if (newPassword !== confirmNewPassword) {
      setForgotLoading(false);
      setForgotError('Passwords do not match.');
      return;
    }

    try {
      const { data } = await api.post('/auth/forgot-password/verify-otp', {
        email: forgotEmail,
        otp,
        newPassword,
      });

      setForgotSuccess(data.message || 'Password reset successful. You can login now.');
      setShowForgotPassword(false);
      setForgotStep('request');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassword('');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Could not reset password. Check OTP and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950 bg-gradient-auth">
      <div className="max-w-7xl w-full grid gap-6 lg:grid-cols-[1.08fr_0.92fr] items-stretch">
        <div className="card-glass hidden lg:flex flex-col p-7 xl:p-8 border-brand-500/20 animate-slide-up overflow-hidden relative">
          <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative z-10 mb-5">
            <p className="chip border-cyan-400/40 bg-cyan-400/10 text-cyan-200">Secure sign in</p>
            <h1 className="mt-4 font-display text-3xl xl:text-4xl leading-tight text-white">Welcome back</h1>
          </div>
          <div className="relative z-10 rounded-[24px] border border-slate-700/70 bg-surface-900/50 p-2 h-[430px] xl:h-[500px]">
            <img
              src="/log.png"
              alt="Login workspace preview"
              className="w-full h-full rounded-[18px] object-cover object-top"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-[18px] bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent p-4">
              <div className="flex items-center gap-2">
                <span className="badge-info">Private</span>
                <span className="badge-success">Synced</span>
              </div>
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
              <div className="text-right -mt-1">
                <button
                  type="button"
                  className="text-xs text-brand-300 hover:text-brand-200 transition-colors"
                  onClick={toggleForgotPassword}
                >
                  {showForgotPassword ? 'Close forgot password' : 'Forgot password?'}
                </button>
              </div>
              <button
                type="submit"
                className="btn-primary w-full text-base"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {showForgotPassword && (
              <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="text-sm text-cyan-100 font-medium mb-3">Reset password via OTP</p>

                {forgotError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-red-300 text-sm mb-3">
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-sm mb-3">
                    {forgotSuccess}
                  </div>
                )}

                {forgotStep === 'request' ? (
                  <form onSubmit={handleRequestOtp} className="space-y-3">
                    <div>
                      <label htmlFor="forgot-email" className="label">Email</label>
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        className="input"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={forgotLoading}>
                      {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <div>
                      <label htmlFor="forgot-email-verify" className="label">Email</label>
                      <input
                        id="forgot-email-verify"
                        type="email"
                        className="input"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="forgot-otp" className="label">OTP code</label>
                      <input
                        id="forgot-otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="6 digit OTP"
                        className="input"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="new-password" className="label">New password</label>
                      <input
                        id="new-password"
                        type="password"
                        className="input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="confirm-new-password" className="label">Confirm new password</label>
                      <input
                        id="confirm-new-password"
                        type="password"
                        className="input"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={forgotLoading}>
                      {forgotLoading ? 'Resetting...' : 'Verify OTP and Reset Password'}
                    </button>
                    <button
                      type="button"
                      className="w-full text-xs text-slate-300 hover:text-white"
                      onClick={() => {
                        setForgotStep('request');
                        setOtp('');
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                    >
                      Use different email / request OTP again
                    </button>
                  </form>
                )}
              </div>
            )}
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
