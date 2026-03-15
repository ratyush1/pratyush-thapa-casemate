import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const getDocumentViewUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':5000') : '');
  return base + (url.startsWith('/') ? url : '/' + url);
};

export default function AdminLawyers() {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLawyers = () => {
      api.get('/admin/lawyers').then(({ data }) => {
        setLawyers(data.lawyers || []);
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
  }, []);

  const verify = async (userId) => {
    try {
      await api.post(`/admin/lawyers/${userId}/verify`);
      setLawyers((list) => list.map((l) => (l.user?._id === userId ? { ...l, verified: true, profile: { ...l.profile, verified: true } } : l)));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification queue</p>
        <h2 className="mt-2 section-title">Lawyers and documents</h2>
        <p className="mt-2 text-sm text-slate-400">Review submitted proof, then verify lawyers once their documents are complete.</p>
      </div>
      <div className="table-shell">
        <div className="table-wrap">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th>Lawyer</th>
                <th>Email</th>
                <th>Documents</th>
                <th>Verified</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lawyers.map((l) => (
                <tr key={l.user?._id} className="table-row">
                  <td>
                    <div className="font-semibold text-white">{l.user?.name}</div>
                  </td>
                  <td className="text-slate-400">{l.user?.email}</td>
                  <td>
                    {(l.documents && l.documents.length > 0) ? (
                      <ul className="space-y-2">
                        {l.documents.map((doc, i) => {
                          const viewUrl = getDocumentViewUrl(doc.url);
                          return (
                            <li key={i} className="rounded-2xl border border-slate-700/60 bg-white/[0.03] px-3 py-2">
                              <span className="block text-slate-200 font-medium">{doc.name}</span>
                              {viewUrl ? (
                                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-brand-400 text-xs font-semibold hover:underline">
                                  View
                                </a>
                              ) : (
                                <span className="block text-slate-500 text-xs">No link</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="badge-warning">Document required</span>
                    )}
                  </td>
                  <td>
                    {l.verified || l.profile?.verified ? (
                      <span className="badge-success">Verified</span>
                    ) : (
                      <span className="badge-neutral">Pending</span>
                    )}
                  </td>
                  <td>
                    {!(l.verified || l.profile?.verified) && (
                      (l.documents && l.documents.length > 0) ? (
                        <button type="button" onClick={() => verify(l.user._id)} className="btn-primary text-sm rounded-xl">
                          Verify lawyer
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">Add documents first</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lawyers.length === 0 && <div className="p-8 text-center text-slate-500">No lawyers yet.</div>}
      </div>
    </div>
  );
}
