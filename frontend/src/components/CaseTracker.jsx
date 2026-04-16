import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import StarRating from './StarRating';

// ─── Static config ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'submitted',    label: 'Submitted',    desc: 'Request sent to lawyer' },
  { key: 'reviewed',     label: 'Under Review', desc: 'Lawyer reviewing documents' },
  { key: 'accepted',     label: 'Accepted',     desc: 'Lawyer confirmed' },
  { key: 'paid',         label: 'Payment',      desc: 'Consultation fee settled' },
  { key: 'completed',    label: 'Completed',    desc: 'Case resolved' },
];

const EVENT_META = {
  created:           { icon: '📋', color: 'text-brand-400',   label: 'Appointment Requested' },
  case_reviewed:     { icon: '🔍', color: 'text-cyan-400',    label: 'Case Reviewed by Lawyer' },
  accepted:          { icon: '✅', color: 'text-emerald-400', label: 'Appointment Accepted' },
  rejected:          { icon: '❌', color: 'text-red-400',     label: 'Appointment Declined' },
  completed:         { icon: '🎉', color: 'text-emerald-400', label: 'Case Completed' },
  cancelled:         { icon: '🚫', color: 'text-slate-400',   label: 'Appointment Cancelled' },
  paid:              { icon: '💳', color: 'text-yellow-400',  label: 'Payment Completed' },
  document_uploaded: { icon: '📎', color: 'text-blue-400',   label: 'Document Added' },
};

const STATUS_FILTER_TABS = [
  { id: 'all',       label: 'All Cases' },
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed',    label: 'Closed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStepIndex(apt) {
  if (apt.status === 'completed') return 4;
  if (apt.paymentStatus === 'paid') return 3;
  if (apt.status === 'accepted') return 2;
  if (apt.lawyerReviewed) return 1;
  return 0;
}

function isClosed(apt) {
  return apt.status === 'rejected' || apt.status === 'cancelled';
}

function filterAppointments(appointments, filter) {
  if (filter === 'active')    return appointments.filter((a) => !isClosed(a) && a.status !== 'completed');
  if (filter === 'completed') return appointments.filter((a) => a.status === 'completed');
  if (filter === 'closed')    return appointments.filter((a) => isClosed(a));
  return appointments;
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const statusBadge = (status) => {
  if (status === 'completed') return 'badge-success';
  if (status === 'accepted')  return 'badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge-danger';
  return 'badge-warning';
};

// ─── Sub‑components ───────────────────────────────────────────────────────────
function ProgressStepper({ appointment }) {
  const stepIdx = getStepIndex(appointment);
  const closed  = isClosed(appointment);

  return (
    <div className="relative flex items-center gap-0 mt-4">
      {STEPS.map((step, i) => {
        const done    = stepIdx > i;
        const active  = stepIdx === i && !closed;
        const isRejected = closed && i === 2; // accepted step — show red when rejected
        const lineColor = done ? 'bg-brand-500' : 'bg-slate-700/60';

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center z-10 shrink-0" style={{ minWidth: 48 }}>
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-sm
                  ${isRejected
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : done
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : active
                    ? 'border-brand-400 bg-brand-400/20 text-brand-400 ring-2 ring-brand-400/30 ring-offset-1 ring-offset-transparent'
                    : 'border-slate-600 bg-surface-900 text-slate-600'}`}
              >
                {isRejected ? '✕' : done ? '✓' : active ? <span className="animate-pulse">●</span> : <span className="text-xs">{i + 1}</span>}
              </div>
              {/* Label */}
              <span className={`text-xs mt-1 text-center leading-tight
                ${isRejected ? 'text-red-400' : done || active ? 'text-white' : 'text-slate-500'}`}
                style={{ width: 52 }}
              >
                {isRejected ? 'Declined' : step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 ${done ? 'bg-brand-500' : 'bg-slate-700/60'} transition-all`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TimelineEntry({ entry, isNew }) {
  const meta = EVENT_META[entry.event] || { icon: '●', color: 'text-slate-400', label: entry.event };
  return (
    <div className={`flex gap-3 ${isNew ? 'animate-fade-in' : ''}`}>
      <div className="flex flex-col items-center shrink-0">
        <span className="text-lg">{meta.icon}</span>
        <div className="w-px flex-1 bg-slate-700/40 mt-1" />
      </div>
      <div className="pb-4 min-w-0">
        <p className={`text-sm font-medium ${meta.color}`}>{meta.label}</p>
        {entry.note && <p className="text-slate-400 text-xs mt-0.5">{entry.note}</p>}
        <p className="text-slate-600 text-xs mt-1">{relativeTime(entry.timestamp)} · {new Date(entry.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CaseTracker() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [expandedId, setExpandedId]     = useState(null);
  const [newEntries, setNewEntries]     = useState({}); // aptId -> Set of timestamp strings
  const [liveConnected, setLiveConnected] = useState(false);
  const [myReviews, setMyReviews]       = useState({});
  const [reviewingApt, setReviewingApt] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError]   = useState('');
  const socketRef = useRef(null);

  const fetchAll = useCallback(() => {
    api.get('/appointments').then(({ data }) => {
      setAppointments(data.appointments || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    api.get('/reviews/my-reviews').then(({ data }) => {
      const map = {};
      (data.reviews || []).forEach((r) => { map[r.appointment] = r; });
      setMyReviews(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAll();

    const socket = io((import.meta.env.VITE_API_URL || '').replace(/\/\/$/, '') || undefined, {
      path: '/socket.io',
      auth: { token: localStorage.getItem('token') },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on('connect',    () => setLiveConnected(true));
    socket.on('disconnect', () => setLiveConnected(false));

    // New timeline entry pushed by the server
    socket.on('case_timeline_update', (payload) => {
      try {
        const { appointmentId, entry, appointment: fullApt } = payload || {};
        if (!appointmentId || !entry) return;

        setAppointments((prev) => {
          let found = false;
          const next = prev.map((a) => {
            if (a._id !== appointmentId) return a;
            found = true;
            const base = fullApt || a;
            // Merge timeline (deduplicate by timestamp+event)
            const existing = a.timeline || [];
            const incoming = base.timeline || [...existing, entry];
            const merged = [...incoming];
            return { ...base, timeline: merged };
          });
          if (!found && fullApt) return [fullApt, ...prev];
          return next;
        });

        setNewEntries((prev) => {
          const key = `${entry.event}_${entry.timestamp}`;
          const set = new Set(prev[appointmentId] || []);
          set.add(key);
          return { ...prev, [appointmentId]: set };
        });

        // Auto-expand the updated case
        setExpandedId(appointmentId);
      } catch (e) {}
    });

    // Full status update
    socket.on('appointment_notification', (payload) => {
      try {
        const { appointmentId, appointment: fullApt } = payload || {};
        if (!appointmentId) return;
        setAppointments((prev) =>
          prev.map((a) => {
            if (a._id !== appointmentId) return a;
            const updated = fullApt || a;
            return { ...a, ...updated, timeline: updated.timeline || a.timeline || [] };
          })
        );
      } catch (e) {}
    });

    // Deletion
    socket.on('appointment_deleted', (payload) => {
      try {
        const aptId = payload?.appointmentId;
        if (aptId) {
          setAppointments((prev) => prev.filter((a) => a._id !== aptId));
          if (expandedId === aptId) setExpandedId(null);
        }
      } catch (e) {}
    });

    return () => { try { socket.disconnect(); } catch (e) {} };
  }, [fetchAll]);

  const submitReview = async () => {
    if (!reviewRating) { setReviewError('Please select a rating.'); return; }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await api.post('/reviews', { appointmentId: reviewingApt._id, rating: reviewRating, comment: reviewComment });
      const { data } = await api.get('/reviews/my-reviews');
      const map = {};
      (data.reviews || []).forEach((r) => { map[r.appointment] = r; });
      setMyReviews(map);
      setReviewingApt(null);
    } catch (e) {
      setReviewError(e.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const displayed = filterAppointments(appointments, filter);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Case Tracker</h2>
          <p className="text-sm text-slate-400">Live progress on all your legal cases</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${
            liveConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-700/40 border-slate-600/40 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {liveConnected ? 'Live' : 'Offline'}
          </span>
          <button onClick={fetchAll} className="btn-ghost text-xs">Refresh</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs-shell">
        {STATUS_FILTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`tab-pill ${filter === t.id ? 'tab-pill-active' : ''}`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">
              {filterAppointments(appointments, t.id).length}
            </span>
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          {filter === 'all' ? 'No cases yet. Book a lawyer from the Find Lawyers tab.' : `No ${filter} cases.`}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((apt) => {
            const isExpanded  = expandedId === apt._id;
            const closed      = isClosed(apt);
            const timeline    = (apt.timeline || []).slice().reverse(); // newest first
            const hasNewEntry = newEntries[apt._id]?.size > 0;

            return (
              <div
                key={apt._id}
                className={`card-glass border transition-all ${
                  hasNewEntry
                    ? 'border-brand-400/40'
                    : closed
                    ? 'border-slate-700/30 opacity-80'
                    : 'border-slate-700/40'
                }`}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : apt._id);
                    if (!isExpanded) setNewEntries((p) => ({ ...p, [apt._id]: new Set() }));
                  }}
                  className="w-full text-left p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-400/20 flex items-center justify-center text-brand-400 font-bold shrink-0">
                        {(apt.lawyer?.name || 'L').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white truncate">{apt.lawyer?.name || 'Lawyer'}</p>
                          <span className={statusBadge(apt.status)}>{apt.status}</span>
                          {hasNewEntry && <span className="badge-info text-xs animate-pulse">New update</span>}
                        </div>
                        <p className="text-slate-400 text-sm mt-0.5">
                          {new Date(apt.date).toLocaleDateString()} · {apt.timeSlot}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${
                        apt.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-700/30 border-slate-600/40 text-slate-500'
                      }`}>
                        {apt.paymentStatus === 'paid' ? '💳 Paid' : `NPR ${apt.amount}`}
                      </span>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress stepper always visible */}
                  {!closed && <ProgressStepper appointment={apt} />}
                  {closed && (
                    <div className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                      <span>{apt.status === 'rejected' ? '❌ This appointment was declined.' : '🚫 This appointment was cancelled.'}</span>
                    </div>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-700/40 px-5 pb-5">
                    <div className="grid md:grid-cols-2 gap-6 pt-5">
                      {/* Left: Case details */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-300">Case Details</h4>
                        {apt.caseDetails ? (
                          <p className="text-slate-400 text-sm bg-surface-800/50 rounded-xl p-3 leading-relaxed">{apt.caseDetails}</p>
                        ) : (
                          <p className="text-slate-600 text-sm italic">No case details provided.</p>
                        )}

                        {apt.caseDocuments?.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-2">Documents</p>
                            <div className="flex flex-wrap gap-2">
                              {apt.caseDocuments.map((_, i) => (
                                <span key={i} className="badge-neutral text-xs">📎 Document {i + 1}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {apt.notes && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Lawyer's Notes</p>
                            <p className="text-slate-400 text-sm bg-surface-800/50 rounded-xl p-3">{apt.notes}</p>
                          </div>
                        )}

                        {/* Review button for completed cases */}
                        {apt.status === 'completed' && (
                          <div className="pt-1">
                            {myReviews[apt._id] ? (
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <StarRating value={myReviews[apt._id].rating} size="sm" />
                                <span>You reviewed this case</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewingApt(apt);
                                  setReviewRating(0);
                                  setReviewComment('');
                                  setReviewError('');
                                }}
                                className="btn-secondary rounded-xl text-sm"
                              >
                                ⭐ Write a Review
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Timeline */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-4">Activity Timeline</h4>
                        {timeline.length === 0 ? (
                          <p className="text-slate-600 text-sm italic">No activity recorded yet.</p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto pr-1 space-y-0 scrollbar-thin">
                            {timeline.map((entry, i) => {
                              const key = `${entry.event}_${entry.timestamp}`;
                              const isNew = newEntries[apt._id]?.has(key);
                              return <TimelineEntry key={i} entry={entry} isNew={isNew} />;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-glass w-full max-w-md p-6 space-y-5 border border-slate-700/60 shadow-2xl">
            <div>
              <h2 className="text-lg font-semibold text-white">Review {reviewingApt.lawyer?.name}</h2>
              <p className="text-sm text-slate-400 mt-1">Share your experience to help other clients.</p>
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-2">Your rating</p>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Written feedback (optional)</label>
              <textarea
                className="input w-full h-28 resize-none"
                placeholder="Describe your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{reviewComment.length}/1000</p>
            </div>
            {reviewError && <p className="text-sm text-red-400">{reviewError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setReviewingApt(null)} className="btn-ghost" disabled={reviewSubmitting}>Cancel</button>
              <button type="button" onClick={submitReview} className="btn-primary" disabled={reviewSubmitting || !reviewRating}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
