import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { getAssetUrl } from '../utils/media';
import StarRating from '../components/StarRating';

export default function LawyerProfileView() {
  const { id } = useParams();
  const [lawyer, setLawyer] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLawyer = () => {
      api.get(`/lawyers/${id}`)
        .then(({ data }) => {
          if (!mounted) return;
          setLawyer(data.lawyer || null);
          setProfile(data.profile || null);
        })
        .catch(() => {
          if (!mounted) return;
          setLawyer(null);
          setProfile(null);
        })
        .finally(() => { if (mounted) setLoading(false); });
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      const payload = event?.detail?.payload;
      if (type === 'lawyer_updated' && payload?.lawyerId && String(payload.lawyerId) === String(id)) {
        fetchLawyer();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchLawyer();
    return () => {
      mounted = false;
      window.removeEventListener('casemate:realtime', onRealtime);
    };
  }, [id]);

  useEffect(() => {
    setReviewsLoading(true);
    api.get(`/reviews/lawyer/${id}`)
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [id]);

  if (loading) return <div className="card p-8 text-center">Loading...</div>;
  if (!lawyer) return <div className="card p-8 text-center">Lawyer not found.</div>;

  const avatarUrl = getAssetUrl(lawyer.avatar);
  const availability = profile?.availability || null;

  const avgRating = profile?.rating || 0;
  const totalReviews = profile?.totalReviews || 0;
  const joinedLabel = lawyer?.createdAt ? new Date(lawyer.createdAt).getFullYear() : null;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const roundedAvg = Number(avgRating || 0).toFixed(1);
  const topSpecializations = (profile?.specialization || []).slice(0, 6);

  return (
    <div className="page-shell">
      <section className="card-glass p-6 md:p-8 border-brand-500/15 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Lawyer avatar"
                  className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-cover border border-slate-600/70 shadow-xl shadow-black/30"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-surface-800 border border-slate-700/70" />
              )}

              <div className="min-w-0">
                <p className="chip mb-2">Lawyer profile</p>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white truncate">{lawyer.name}</h1>
                <p className="text-slate-400 text-sm md:text-base truncate mt-1">{lawyer.email}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {profile?.verified && <span className="badge-success">Verified lawyer</span>}
                  {joinedLabel && <span className="badge-neutral">Since {joinedLabel}</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-white/[0.03] p-4 min-w-[210px]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average rating</p>
              {totalReviews > 0 ? (
                <>
                  <p className="kpi-value mt-2">{roundedAvg}</p>
                  <div className="mt-1"><StarRating value={avgRating} size="sm" /></div>
                  <p className="text-sm text-slate-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <p className="text-slate-400 mt-2">No ratings yet</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/70 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Consultation fee</p>
              <p className="text-brand-300 text-xl font-semibold mt-2">NPR {profile?.hourlyRate || 0}/hr</p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-white/[0.03] p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Availability</p>
              <p className="text-slate-300 mt-2">
                {availability
                  ? `${availability.days?.join(', ') || '—'}${availability.startTime && availability.endTime ? ` · ${availability.startTime} - ${availability.endTime}` : ''}`
                  : 'Not provided'}
              </p>
            </div>
          </div>

          {topSpecializations.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Practice areas</p>
              <div className="flex flex-wrap gap-2">
                {topSpecializations.map((spec) => (
                  <span key={spec} className="badge-info">{spec}</span>
                ))}
              </div>
            </div>
          )}

          {profile?.bio && (
            <div className="rounded-2xl border border-slate-700/70 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">About</p>
              <p className="text-slate-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          <div>
            <Link to="/" className="btn-ghost">Back</Link>
          </div>
        </div>
      </section>

      <section className="card-glass p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-semibold text-white">Client Feedback Snapshot</h3>
            <span className="badge-info">Public reviews</span>
          </div>

          {totalReviews > 0 ? (
            <div className="space-y-2.5">
              {ratingDistribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-slate-300 text-right">{star}</span>
                  <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <div className="flex-1 bg-slate-700/40 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full"
                      style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-6 text-right text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No ratings recorded yet.</p>
          )}
      </section>

      <section className="card-glass p-6 md:p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">All Client Reviews</h3>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{roundedAvg}</span>
              <div>
                <StarRating value={avgRating} size="sm" />
                <p className="text-xs text-slate-500 mt-0.5">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <div className="rounded-2xl border border-slate-700/60 bg-white/[0.02] p-5 text-slate-500 text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/70 bg-white/[0.02] p-5 text-slate-500 text-sm">
            No reviews yet. Be the first to review after your appointment.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review._id} className="rounded-2xl border border-slate-700/60 bg-white/[0.03] p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/20 flex items-center justify-center text-sm font-semibold text-brand-300 shrink-0">
                    {(review.client?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-white text-sm md:text-base truncate">{review.client?.name || 'Client'}</span>
                      <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1"><StarRating value={review.rating} size="sm" /></div>
                    {review.comment ? (
                      <p className="text-slate-300 text-sm mt-2 leading-relaxed">{review.comment}</p>
                    ) : (
                      <p className="text-slate-500 text-sm mt-2 italic">No written feedback provided.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

