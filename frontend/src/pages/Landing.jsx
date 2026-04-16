import React from 'react';
import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Case-first matching',
    description: 'Get lawyers ranked for your exact issue, not just general profiles.',
  },
  {
    title: 'Verified legal experts',
    description: 'Appointments are handled by vetted lawyers with transparent hourly rates.',
  },
  {
    title: 'One secure workspace',
    description: 'Chat, files, payments, and case updates in a single protected timeline.',
  },
];

const steps = [
  {
    title: 'Share your issue',
    body: 'Describe your legal problem in plain language and upload supporting documents.',
  },
  {
    title: 'Compare matched lawyers',
    body: 'Review specialization, pricing, and verification status before you choose.',
  },
  {
    title: 'Book and resolve faster',
    body: 'Confirm appointment, pay securely, then continue in chat and call with your lawyer.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
      </div>

      <header className="relative z-10 border-b border-slate-800/70 bg-surface-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="CaseMate" className="w-20 sm:w-24 h-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-ghost rounded-full text-sm px-4 py-2">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary rounded-full text-sm px-4 sm:px-5 py-2.5">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20 pb-10 md:pb-14">
          <div className="grid gap-8 md:gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6 animate-slide-up">
              <p className="chip border-cyan-400/40 bg-cyan-400/10 text-cyan-200">Guided legal support for Nepal</p>
              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.04] tracking-tight max-w-4xl">
                A calmer, clearer way to move legal cases forward.
              </h1>
              <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
                CaseMate combines practical AI guidance, verified lawyers, document sharing, and appointment workflows in one secure workspace.
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1 max-w-lg">
                <Link to="/register" className="btn-primary rounded-full px-7 py-3 text-base font-semibold w-full sm:w-auto">
                  Create account
                </Link>
                <Link to="/login" className="btn-secondary rounded-full px-6 py-3 text-base w-full sm:w-auto">
                  I already have an account
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 pt-2 text-sm text-slate-300 max-w-3xl">
                <div>
                  <span className="text-cyan-300 font-semibold">24/7</span> AI legal guidance
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Verified</span> lawyer network
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Secure</span> case workflow
                </div>
              </div>
            </div>

            <div className="card-glass border-cyan-500/20 p-5 md:p-7 lg:p-8 shadow-glow animate-fade-in">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live workspace preview</p>
                  <h2 className="mt-2 font-display text-2xl text-white">From question to consultation</h2>
                </div>
                <span className="badge-success">Matched</span>
              </div>
              <div className="mt-5 rounded-[24px] border border-slate-700/70 bg-surface-900/85 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">Case summary</p>
                  <span className="badge-info">AI ranked</span>
                </div>
                <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                  Employment contract dispute regarding unpaid overtime and wrongful dismissal notice.
                </p>
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-700/70 bg-surface-900/75 p-5">
                <p className="text-sm font-semibold text-slate-200">Top recommended lawyer</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">Aarav Sharma</p>
                    <p className="text-xs text-slate-400 mt-0.5">Employment Law • 8 years • Verified</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-300 font-semibold">96% match</p>
                    <p className="text-xs text-slate-400">NPR 4500/hr</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-900/85 border border-slate-700/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Response</p>
                  <p className="text-sm text-white mt-1">Under 1h</p>
                </div>
                <div className="rounded-2xl bg-slate-900/85 border border-slate-700/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Docs</p>
                  <p className="text-sm text-white mt-1">Encrypted</p>
                </div>
                <div className="rounded-2xl bg-slate-900/85 border border-slate-700/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Payment</p>
                  <p className="text-sm text-white mt-1">Integrated</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {highlights.map((item) => (
              <article key={item.title} className="metric-card">
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="card-glass border-slate-700/70 p-5 md:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="section-title">How it works</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">Simple process</span>
            </div>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-[24px] border border-slate-700/70 bg-surface-900/65 p-5">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <h3 className="text-white font-semibold mt-4">{step.title}</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-20">
          <div className="rounded-[32px] border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 via-teal-400/10 to-amber-300/15 p-6 md:p-10 shadow-panel">
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                Ready to solve your legal case with confidence?
              </h2>
              <p className="text-slate-200 mt-3 text-sm md:text-base">
                Join CaseMate and get practical guidance plus direct access to trusted lawyers.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg">
                <Link to="/register" className="btn-primary rounded-full px-6 py-3 text-base font-semibold w-full sm:w-auto">
                  Get started now
                </Link>
                <Link to="/login" className="btn-ghost rounded-full border border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
