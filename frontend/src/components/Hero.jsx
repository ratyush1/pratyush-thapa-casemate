import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="w-full bg-gradient-mesh py-16 rounded-2xl mb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">Legal help simplified — AI + Verified Lawyers</h1>
          <p className="text-slate-300 mt-4 max-w-xl">Get quick legal answers from our AI assistant and book consultations with verified lawyers. Secure, fast, and affordable.</p>
          <div className="mt-6 flex gap-3">
            <Link to="/register" className="btn-primary">Get started</Link>
            <Link to="/login" className="btn-ghost">Sign in</Link>
          </div>
        </div>
        <div className="hidden md:block w-96 h-56 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 shadow-glow" />
      </div>
    </section>
  );
}
