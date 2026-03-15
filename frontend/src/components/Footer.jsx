import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800/60 bg-surface-950/70 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/30 to-cyan-500/20 border border-brand-500/30 flex items-center justify-center">
            <img src="/favicon.svg" alt="CaseMate" className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">CaseMate</div>
            <div className="text-xs text-slate-400">Smart legal connections</div>
          </div>
        </div>
        <div className="text-sm text-slate-400">© {new Date().getFullYear()} CaseMate. All rights reserved.</div>
        <div className="flex gap-3 items-center">
          <a href="#" className="text-slate-400 hover:text-white text-sm">Privacy</a>
          <a href="#" className="text-slate-400 hover:text-white text-sm">Terms</a>
        </div>
      </div>
    </footer>
  );
}
