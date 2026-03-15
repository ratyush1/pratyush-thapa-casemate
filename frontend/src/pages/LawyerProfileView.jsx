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

  const docs = profile?.documents || [];
  const avatarUrl = getAssetUrl(lawyer.avatar);
  const availability = profile?.availability || null;
  const getViewUrl = (url) => {
    return getAssetUrl(url);
  };

  const avgRating = profile?.rating || 0;
  const totalReviews = profile?.totalReviews || 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-6">
      <div className="card-glass p-6 md:p-8 border-brand-500/15 relative overflow-hidden">
        <div className="absolute -top-14 -right-10 w-52 h-52 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex items-center gap-4">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" /> : <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-surface-800" />}
            <div>
              <h1 className="text-2xl font-bold text-white">{lawyer.name}</h1>
              <p className="text-slate-400">{lawyer.email}</p>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={avgRating} size="sm" />
                  <span className="text-sm text-slate-400">{avgRating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          {profile?.verified && <span className="text-sm bg-brand-500/20 text-brand-400 px-3 py-1 rounded">Verified</span>}
        </div>
        <div className="mt-4">
          {profile?.specialization?.length > 0 && <p className="text-slate-400">Specialization: {profile.specialization.join(', ')}</p>}
          {availability && (
            <p className="text-slate-400 mt-2">Availability: {availability.days?.join(', ') || '—'} {availability.startTime && availability.endTime ? `· ${availability.startTime} - ${availability.endTime}` : ''}</p>
          )}
          {profile?.bio && <p className="text-slate-500 mt-2">{profile.bio}</p>}
          <p className="text-brand-400 font-semibold mt-3">NPR {profile?.hourlyRate || 0}/hr</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Link to="/" className="btn-ghost">Back</Link>
        </div>
      </div>

      <div className="card-glass p-6">
        <h3 className="font-semibold text-white mb-3">Documents</h3>
        {docs.length === 0 ? (
          <p className="text-slate-500">No documents available.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d, i) => (
              <li key={i} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{d.name}</div>
                  {getViewUrl(d.url) ? (
                    <a href={getViewUrl(d.url)} target="_blank" rel="noreferrer" className="text-sm text-brand-400">View</a>
                  ) : (
                    <div className="text-sm text-slate-500">No link</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reviews Section */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Client Reviews</h3>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">{avgRating.toFixed(1)}</span>
              <div>
                <StarRating value={avgRating} size="sm" />
                <p className="text-xs text-slate-500 mt-0.5">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>

        {totalReviews > 0 && (
          <div className="mb-5 space-y-1.5">
            {ratingDistribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-slate-400 text-right">{star}</span>
                <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <div className="flex-1 bg-slate-700/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400/80 rounded-full"
                    style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-4 text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        )}

        {reviewsLoading ? (
          <p className="text-slate-500 text-sm">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-slate-500 text-sm">No reviews yet. Be the first to review after your appointment.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="border-t border-slate-700/40 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-400/20 flex items-center justify-center text-sm font-semibold text-brand-400 shrink-0">
                    {(review.client?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white text-sm">{review.client?.name || 'Client'}</span>
                      <span className="text-xs text-slate-500 shrink-0">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-0.5">
                      <StarRating value={review.rating} size="sm" />
                    </div>
                    {review.comment && (
                      <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

