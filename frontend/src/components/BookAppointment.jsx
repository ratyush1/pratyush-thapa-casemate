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
    <div className="card p-6 md:p-8 max-w-lg border-slate-700/50 animate-slide-up">
      <button type="button" onClick={onBack} className="text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors">
        ← Back to lawyers
      </button>
      <h2 className="font-display text-xl font-bold text-white mb-1">Book consultation</h2>
      <p className="text-slate-400 text-sm mb-6">
        {lawyer.name} · NPR {lawyer.profile?.hourlyRate || 0}/hr · {lawyer.profile?.specialization?.join(', ')}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
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
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} required />
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
  );
}
