import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StarRating from './StarRating';

export default function BookAppointment({ lawyer, onDone, onBack }) {
  const { refreshMe } = useAuth();
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [caseDetails, setCaseDetails] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentReviews, setRecentReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [hasReviewedLawyer, setHasReviewedLawyer] = useState(false);
  const [reviewedAppointmentsCount, setReviewedAppointmentsCount] = useState(0);
  const [ownReviewsForLawyer, setOwnReviewsForLawyer] = useState([]);
  const [showOwnReviews, setShowOwnReviews] = useState(false);

  const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  const minDate = new Date().toISOString().slice(0, 10);

  React.useEffect(() => {
    let mounted = true;
    setReviewsLoading(true);
    api.get(`/reviews/lawyer/${lawyer._id}`)
      .then(({ data }) => {
        if (!mounted) return;
        setRecentReviews((data.reviews || []).slice(0, 2));
      })
      .catch(() => {
        if (!mounted) return;
        setRecentReviews([]);
      })
      .finally(() => {
        if (mounted) setReviewsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [lawyer._id]);

  React.useEffect(() => {
    let mounted = true;

    const fetchClientReviewStatusForLawyer = async () => {
      try {
        const [{ data: reviewsData }, { data: appointmentsData }] = await Promise.all([
          api.get('/reviews/my-reviews'),
          api.get('/appointments'),
        ]);

        const myReviews = reviewsData?.reviews || [];
        const reviewByAppointment = new Map(
          myReviews.map((review) => [String(review.appointment), review])
        );

        const reviewedForSelectedLawyer = (appointmentsData?.appointments || []).filter((appointment) => {
          const appointmentId = String(appointment?._id || '');
          const lawyerId = String(appointment?.lawyer?._id || appointment?.lawyer || '');
          return reviewByAppointment.has(appointmentId) && lawyerId === String(lawyer._id);
        }).map((appointment) => {
          const appointmentId = String(appointment?._id || '');
          const ownReview = reviewByAppointment.get(appointmentId);
          return {
            appointmentId,
            appointmentDate: appointment?.date,
            rating: ownReview?.rating || 0,
            comment: ownReview?.comment || '',
            createdAt: ownReview?.createdAt,
          };
        });

        if (!mounted) return;
        setReviewedAppointmentsCount(reviewedForSelectedLawyer.length);
        setHasReviewedLawyer(reviewedForSelectedLawyer.length > 0);
        setOwnReviewsForLawyer(reviewedForSelectedLawyer);
      } catch (e) {
        if (!mounted) return;
        setReviewedAppointmentsCount(0);
        setHasReviewedLawyer(false);
        setOwnReviewsForLawyer([]);
      }
    };

    fetchClientReviewStatusForLawyer();

    return () => {
      mounted = false;
    };
  }, [lawyer._id]);

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
          {Number(lawyer.profile?.totalReviews || 0) > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={Number(lawyer.profile?.rating || 0)} size="sm" />
              <p className="text-sm text-slate-300">
                {Number(lawyer.profile?.rating || 0).toFixed(1)} from {lawyer.profile?.totalReviews} review{lawyer.profile?.totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          {hasReviewedLawyer && (
            <button
              type="button"
              onClick={() => setShowOwnReviews((v) => !v)}
              className="mt-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/15"
            >
              You already reviewed this lawyer{reviewedAppointmentsCount > 1 ? ` (${reviewedAppointmentsCount} appointments)` : ''}
            </button>
          )}
          {hasReviewedLawyer && showOwnReviews && (
            <div className="mt-3 space-y-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-300">Your submitted feedback</p>
              {ownReviewsForLawyer.map((review) => (
                <div key={review.appointmentId} className="rounded-xl border border-slate-700/60 bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      {review.appointmentDate ? new Date(review.appointmentDate).toLocaleDateString() : 'Appointment'}
                    </span>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.comment && <p className="text-xs text-slate-300 mt-1.5 line-clamp-3">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
          <p className="text-brand-300 font-semibold mt-3">NPR {lawyer.profile?.hourlyRate || 0}/hr</p>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">{lawyer.profile?.specialization?.join(', ') || 'General legal practice'}</p>
          <Link
            to={`/lawyers/${lawyer._id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-4 text-sm text-brand-300 hover:text-brand-200"
          >
            Open full profile and all feedback
          </Link>
          <div className="mt-4 rounded-2xl border border-slate-700/60 bg-white/[0.02] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Recent client feedback</p>
            {reviewsLoading ? (
              <p className="text-sm text-slate-500 mt-2">Loading feedback...</p>
            ) : recentReviews.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">No feedback yet.</p>
            ) : (
              <div className="space-y-2 mt-2">
                {recentReviews.map((review) => (
                  <div key={review._id} className="rounded-xl border border-slate-700/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400 truncate">{review.client?.name || 'Client'}</span>
                      <StarRating value={review.rating} size="sm" />
                    </div>
                    {review.comment && <p className="text-xs text-slate-300 mt-1.5 line-clamp-3">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
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
