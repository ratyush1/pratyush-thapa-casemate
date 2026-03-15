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
      <p className="text-slate-400 text-sm">
        Review lawyers and their submitted documents. Verify a lawyer after checking their documents.
      </p>
      <div className="card overflow-hidden border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-surface-800/80">
              <tr>
                <th className="p-4 text-slate-300 font-medium text-sm">Lawyer</th>
                <th className="p-4 text-slate-300 font-medium text-sm">Email</th>
                <th className="p-4 text-slate-300 font-medium text-sm">Documents</th>
                <th className="p-4 text-slate-300 font-medium text-sm">Verified</th>
                <th className="p-4 text-slate-300 font-medium text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {lawyers.map((l) => (
                <tr key={l.user?._id} className="border-t border-slate-800/80 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-white font-medium">{l.user?.name}</td>
                  <td className="p-4 text-slate-400">{l.user?.email}</td>
                  <td className="p-4">
                    {(l.documents && l.documents.length > 0) ? (
                      <ul className="space-y-1">
                        {l.documents.map((doc, i) => {
                          const viewUrl = getDocumentViewUrl(doc.url);
                          return (
                            <li key={i}>
                              <span className="text-slate-300">{doc.name}</span>
                              {viewUrl ? (
                                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="block text-brand-400 text-xs hover:underline">
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
                      <span className="text-amber-400/90 text-sm">At least one document required</span>
                    )}
                  </td>
                  <td className="p-4">
                    {l.verified || l.profile?.verified ? (
                      <span className="text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="p-4">
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
