import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import StarRating from './StarRating';

const RATINGS = [0, 5, 4, 3, 2, 1]; // 0 = all

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [filterRating, setFilterRating] = useState(0);
  const [filterVisibility, setFilterVisibility] = useState('all'); // 'all' | 'visible' | 'hidden'
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/reviews')
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleVisibility = async (review) => {
    setTogglingId(review._id);
    try {
      const { data } = await api.patch(`/admin/reviews/${review._id}/visibility`);
      setReviews((list) => list.map((r) => (r._id === review._id ? { ...r, isHidden: data.review.isHidden } : r)));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update review');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    if (filterRating && r.rating !== filterRating) return false;
    if (filterVisibility === 'visible' && r.isHidden) return false;
    if (filterVisibility === 'hidden' && !r.isHidden) return false;
    if (search) {
      const q = search.toLowerCase();
      const clientName = (r.client?.name || '').toLowerCase();
      const lawyerName = (r.lawyer?.name || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      if (!clientName.includes(q) && !lawyerName.includes(q) && !comment.includes(q)) return false;
    }
    return true;
  });

  const hiddenCount = reviews.filter((r) => r.isHidden).length;
  const avgRating = reviews.length > 0
    ? (reviews.filter((r) => !r.isHidden).reduce((s, r) => s + r.rating, 0) / (reviews.filter((r) => !r.isHidden).length || 1)).toFixed(1)
    : '—';

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card">
          <p className="text-xs text-slate-400 mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-white">{reviews.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-slate-400 mb-1">Visible</p>
          <p className="text-2xl font-bold text-emerald-400">{reviews.length - hiddenCount}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-slate-400 mb-1">Hidden</p>
          <p className="text-2xl font-bold text-red-400">{hiddenCount}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-slate-400 mb-1">Avg Rating (visible)</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">{avgRating}</p>
            {avgRating !== '—' && <StarRating value={Number(avgRating)} size="sm" />}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search client, lawyer, or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(Number(e.target.value))}
          className="input w-auto"
        >
          <option value={0}>All ratings</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>{s} star{s > 1 ? 's' : ''}</option>
          ))}
        </select>
        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-400">Loading reviews...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No reviews match the current filters.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review._id}
              className={`metric-card flex flex-wrap justify-between gap-4 ${review.isHidden ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2 mb-1.5">
                  <StarRating value={review.rating} size="sm" />
                  {review.isHidden && (
                    <span className="badge-danger text-xs">Hidden</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm mb-2">
                  <span className="text-slate-300">
                    <span className="text-slate-500">Client: </span>{review.client?.name || '—'}
                  </span>
                  <span className="text-slate-300">
                    <span className="text-slate-500">Lawyer: </span>{review.lawyer?.name || '—'}
                  </span>
                  {review.appointment?.date && (
                    <span className="text-slate-500 text-xs">
                      Apt: {new Date(review.appointment.date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">
                    Submitted: {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment ? (
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{review.comment}</p>
                ) : (
                  <p className="text-slate-600 text-sm italic">No written feedback</p>
                )}
              </div>
              <div className="flex items-start shrink-0">
                <button
                  type="button"
                  onClick={() => toggleVisibility(review)}
                  disabled={togglingId === review._id}
                  className={review.isHidden ? 'btn-secondary rounded-xl text-sm' : 'btn-danger rounded-xl text-sm'}
                >
                  {togglingId === review._id
                    ? 'Updating...'
                    : review.isHidden
                    ? 'Show Review'
                    : 'Hide Review'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
