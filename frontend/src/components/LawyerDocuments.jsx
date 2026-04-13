import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Full URL for viewing document (uploaded files are served from backend)
const getDocumentViewUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':5000') : '');
  return base + (url.startsWith('/') ? url : '/' + url);
};

export default function LawyerDocuments() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = () => {
      api.get('/lawyers/me/profile')
        .then(({ data }) => setProfile(data.profile))
        .catch(() => setProfile({ documents: [] }))
        .finally(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      const payload = event?.detail?.payload;
      if ((type === 'lawyer_updated' && payload?.lawyerId && String(payload.lawyerId) === String(user?.id)) ||
          (type === 'user_updated' && payload?.userId && String(payload.userId) === String(user?.id))) {
        fetchProfile();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchProfile();
    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, [user?.id]);

  const documents = profile?.documents || [];
  const hasDocuments = documents.length > 0;

  const addLink = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post('/lawyers/me/documents', { name: name.trim(), url: url.trim() });
      setProfile(data.profile);
      setName('');
      setUrl('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add link');
    } finally {
      setAdding(false);
    }
  };

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file (PDF or image).');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadName.trim()) formData.append('name', uploadName.trim());
      const { data } = await api.post('/lawyers/me/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data.profile);
      setUploadName('');
      setFile(null);
      if (document.getElementById('doc-file-input')) document.getElementById('doc-file-input').value = '';
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed. Max 10MB. Allowed: PDF, JPEG, PNG, GIF, WebP.');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (index) => {
    if (!confirm('Remove this document?')) return;
    try {
      const { data } = await api.delete(`/lawyers/me/documents/${index}`);
      setProfile(data.profile);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove');
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
    <div className="space-y-6">
      <div className="card-glass p-5 md:p-6 border-brand-500/15 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="chip mb-2 inline-flex">Private documents</p>
            <h2 className="font-display text-2xl font-bold text-white">Your secure document vault</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              These files are only visible in your lawyer workspace and are used for verification and your own reference.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-success">Private</span>
            <span className="badge-info">Admin verification</span>
          </div>
        </div>
        {!hasDocuments && (
          <p className="text-amber-300 text-sm mt-4">
            Add or upload at least one document below to complete verification.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="card p-5 md:p-6 border-slate-700/50">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-white">Upload file</h3>
              <p className="text-slate-400 text-sm mt-1">PDF or image (JPEG, PNG, GIF, WebP). Max 10MB.</p>
            </div>
            <span className="badge-neutral">Secure upload</span>
          </div>
          <form onSubmit={uploadFile} className="space-y-4">
            <div>
              <label className="label">Document name</label>
              <input
                type="text"
                className="input rounded-xl"
                placeholder="e.g. Bar License"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">File</label>
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                className="file-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className="btn-primary rounded-xl w-full sm:w-auto" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>

        <div className="card p-5 md:p-6 border-slate-700/50">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-white">Add link</h3>
              <p className="text-slate-400 text-sm mt-1">Add a secure external URL for records or credentials.</p>
            </div>
            <span className="badge-neutral">Private reference</span>
          </div>
          <form onSubmit={addLink} className="space-y-4">
            <div>
              <label className="label">Document name</label>
              <input
                type="text"
                className="input rounded-xl"
                placeholder="e.g. Bar License"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Document URL</label>
              <input
                type="url"
                className="input rounded-xl"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary rounded-xl w-full sm:w-auto" disabled={adding}>
              {adding ? 'Adding...' : 'Add link'}
            </button>
          </form>
        </div>
      </div>

      <div className="card p-5 md:p-6 border-slate-700/50">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-white">Your private documents</h3>
          <span className="badge-info">{documents.length} item{documents.length !== 1 ? 's' : ''}</span>
        </div>
        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/70 bg-white/[0.02] p-6 text-center">
            <p className="text-slate-500 text-sm">No documents yet. Upload a file or add a link above. At least one is required for verification.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc, index) => {
              const viewUrl = getDocumentViewUrl(doc.url);
              return (
                <li key={index} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[22px] bg-surface-800/50 border border-slate-700/50">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-200 block truncate">{doc.name}</span>
                    <span className="text-xs text-slate-500 mt-1 block">Stored privately in your workspace</span>
                    {viewUrl ? (
                      <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-brand-400 text-sm hover:underline">
                        View document
                      </a>
                    ) : (
                      <span className="block text-slate-500 text-sm mt-2">No link</span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeDocument(index)} className="btn-ghost text-red-400 hover:text-red-300 text-sm rounded-xl">
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
