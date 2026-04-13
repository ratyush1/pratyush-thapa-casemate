import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { getAssetUrl } from '../utils/media';
import StarRating from './StarRating';

export default function LawyerList({ onSelect, recommendationContext }) {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState('');
  const [specializedOnly, setSpecializedOnly] = useState(false);
  const [recommendationMeta, setRecommendationMeta] = useState({ enabled: false, inferredArea: null });

  const caseSummary = String(recommendationContext?.caseSummary || '').trim();
  const caseArea = String(recommendationContext?.caseArea || '').trim();
  const inferredArea = String(recommendationMeta?.inferredArea || '').trim();
  const activeCaseArea = caseArea || inferredArea;
  const normalizedActiveCaseArea = activeCaseArea.toLowerCase();
  const displayedLawyers = specializedOnly
    ? lawyers.filter((l) =>
        (l.profile?.specialization || []).some((s) =>
          String(s || '').toLowerCase().includes(normalizedActiveCaseArea)
        )
      )
    : lawyers;

  useEffect(() => {
    const fetchLawyers = () => {
      const params = {};
      if (search) params.search = search;
      if (verified === 'true') params.verified = 'true';
      if (caseSummary) params.caseSummary = caseSummary;
      if (caseArea) params.caseArea = caseArea;
      api.get('/lawyers', { params }).then(({ data }) => {
        setLawyers(data.lawyers || []);
        setRecommendationMeta(data.recommendation || { enabled: false, inferredArea: null });
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      if (type === 'lawyer_updated' || type === 'user_updated') {
        fetchLawyers();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchLawyers();
    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, [search, verified, caseSummary, caseArea]);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading lawyers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recommendationMeta.enabled && (
        <div className="card border-brand-500/30 bg-brand-500/10 p-5">
          <p className="text-sm text-brand-200 font-medium">
            Recommended order based on your case
            {recommendationMeta.inferredArea ? ` (${recommendationMeta.inferredArea})` : ''}.
          </p>
          <p className="text-xs text-slate-300 mt-1">Top results are ranked by specialization match, verification, experience, and rating.</p>
        </div>
      )}
      <div className="card p-4 md:p-5 border-slate-700/50">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search lawyer by name, email, or specialization"
            className="input max-w-xs rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer rounded-2xl border border-slate-700/70 bg-white/[0.03] px-4 py-3">
            <input
              type="checkbox"
              checked={verified === 'true'}
              onChange={(e) => setVerified(e.target.checked ? 'true' : '')}
              className="rounded border-slate-600 bg-surface-800 text-brand-500 focus:ring-brand-500/30"
            />
            Verified only
          </label>
        {activeCaseArea && (
          <button
            type="button"
            onClick={() => setSpecializedOnly((v) => !v)}
            className={`rounded-xl px-3 py-2 text-sm font-medium border transition-colors ${
              specializedOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-surface-800 text-slate-300 border-slate-600 hover:border-emerald-400/40 hover:text-emerald-300'
            }`}
          >
            {specializedOnly ? 'Showing case specialists' : 'Specialized to this case only'}
          </button>
        )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedLawyers.map((l) => (
          <div key={l._id} className="metric-card">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <img
                  src={getAssetUrl(l.avatar) || '/favicon.svg'}
                  alt={l.name || 'Lawyer'}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-600/60 shadow-lg shadow-black/30"
                />
                <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{l.name}</h3>
                <p className="text-slate-500 text-sm truncate">{l.email}</p>
                {l.profile?.totalReviews > 0 && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating value={l.profile.rating || 0} size="sm" />
                    <span className="text-xs text-slate-500">{(l.profile.rating || 0).toFixed(1)} ({l.profile.totalReviews})</span>
                  </div>
                )}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                {l.profile?.verified && (
                  <span className="badge-info">
                    Verified
                  </span>
                )}
                {recommendationMeta.enabled && Number(l.recommendationScore || 0) > 0 && (
                  <span className="badge-success">
                    Match {Math.min(99, Math.max(1, Math.round(l.recommendationScore)))}%
                  </span>
                )}
              </div>
            </div>
            {l.profile?.specialization?.length > 0 && (
              <p className="text-slate-400 text-sm mt-2">{l.profile.specialization.join(', ')}</p>
            )}
            {recommendationMeta.enabled && Array.isArray(l.recommendationReasons) && l.recommendationReasons.length > 0 && (
              <p className="text-emerald-300/90 text-xs mt-2">{l.recommendationReasons[0]}</p>
            )}
            {l.profile?.bio && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{l.profile.bio}</p>}
            <p className="text-brand-300 font-semibold mt-4">NPR {l.profile?.hourlyRate || 0}/hr</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link
                to={`/lawyers/${l._id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full rounded-xl text-sm text-center"
              >
                View profile & feedback
              </Link>
              <button type="button" onClick={() => onSelect(l)} className="btn-primary w-full rounded-xl text-sm">
              Book appointment
              </button>
            </div>
          </div>
        ))}
      </div>
      {displayedLawyers.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          {specializedOnly
            ? `No lawyers found specializing in ${activeCaseArea}.`
            : 'No lawyers found. Try changing the search.'}
        </div>
      )}
    </div>
  );
}
