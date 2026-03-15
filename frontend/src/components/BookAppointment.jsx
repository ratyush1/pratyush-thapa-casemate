import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function BookAppointment({ lawyer, onDone, onBack }) {
  const { refreshMe } = useAuth();
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [caseDetails, setCaseDetails] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const me = await refreshMe();
      if ((me?.role || 'client') !== 'client') {
        setError('You are not logged in as a client account. Please log in with a client account to book appointments.');
        setLoading(false);
        return;
      }

      // require a document file at booking
      if (!documentFile) {
        setError('Please attach a document or image when booking');
        setLoading(false);
        return;
      }
      const form = new FormData();
      form.append('lawyerId', lawyer._id);
      form.append('date', new Date(date).toISOString());
      form.append('timeSlot', timeSlot);
      form.append('caseDetails', caseDetails || '');
      form.append('duration', '60');
      form.append('document', documentFile);
      await api.post('/appointments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 md:p-8 max-w-2xl border-slate-700/50 animate-slide-up">
      <button type="button" onClick={onBack} className="text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors">
        ← Back to lawyers
      </button>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-slate-700/70 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected lawyer</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-white">{lawyer.name}</h2>
          <p className="text-brand-300 font-semibold mt-3">NPR {lawyer.profile?.hourlyRate || 0}/hr</p>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">{lawyer.profile?.specialization?.join(', ') || 'General legal practice'}</p>
          <p className="text-slate-500 text-sm mt-5">Attach at least one document so the lawyer can review your case before accepting.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label">Date</label>
          <input type="date" className="input rounded-xl" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Time</label>
          <select className="input rounded-xl" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            {slots.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Case details (optional)</label>
          <textarea
            className="input min-h-[100px] rounded-xl"
            value={caseDetails}
            onChange={(e) => setCaseDetails(e.target.value)}
            placeholder="Brief description of your legal issue..."
          />
        </div>
        <div>
          <label className="label">Attach document (required)</label>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} className="file-input" required />
          {documentFile && <p className="text-sm text-slate-400 mt-2">Selected: {documentFile.name}</p>}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-secondary rounded-xl flex-1">Cancel</button>
          <button type="submit" className="btn-primary rounded-xl flex-1" disabled={loading}>
            {loading ? 'Booking...' : 'Book appointment'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}
