import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800/60 bg-surface-950/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-cyan-500/20 border border-brand-500/30 flex items-center justify-center shadow-glow">
            <img src="/favicon.svg" alt="CaseMate" className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">CaseMate</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Smart legal connections</div>
          </div>
        </div>
        <div className="text-sm text-slate-400 text-center">© {new Date().getFullYear()} CaseMate. Secure legal support, booking, and case communication.</div>
        <div className="flex gap-3 items-center">
          <a href="#" className="badge-neutral hover:text-white">Privacy</a>
          <a href="#" className="badge-neutral hover:text-white">Terms</a>
        </div>
      </div>
    </footer>
  );
}
