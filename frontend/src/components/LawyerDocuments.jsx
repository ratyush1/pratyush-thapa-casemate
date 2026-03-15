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
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
        <p className="text-amber-200 text-sm font-medium">
          At least one document is required for admin verification. Upload a file (PDF, image) or add a link.
        </p>
        {!hasDocuments && (
          <p className="text-amber-400/90 text-sm mt-1">Add or upload at least one document below.</p>
        )}
      </div>

      <div className="card p-5 md:p-6 border-slate-700/50">
        <h3 className="font-semibold text-white mb-3">Upload file</h3>
        <p className="text-slate-400 text-sm mb-4">PDF or image (JPEG, PNG, GIF, WebP). Max 10MB.</p>
        <form onSubmit={uploadFile} className="flex flex-wrap gap-3 items-end">
          <div className="w-full sm:w-auto min-w-[160px]">
            <label className="label">Document name</label>
            <input
              type="text"
              className="input rounded-xl"
              placeholder="e.g. Bar License"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="label">File</label>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
              className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-brand-500/20 file:text-brand-400 file:font-medium file:cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <button type="submit" className="btn-primary rounded-xl" disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

      <div className="card p-5 md:p-6 border-slate-700/50">
        <h3 className="font-semibold text-white mb-3">Add link</h3>
        <p className="text-slate-400 text-sm mb-4">Or add a document by URL (e.g. link to your license).</p>
        <form onSubmit={addLink} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
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
          <div className="flex-1 min-w-[200px]">
            <label className="label">Document URL</label>
            <input
              type="url"
              className="input rounded-xl"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary rounded-xl" disabled={adding}>
            {adding ? 'Adding...' : 'Add link'}
          </button>
        </form>
      </div>

      <div className="card p-5 md:p-6 border-slate-700/50">
        <h3 className="font-semibold text-white mb-4">Your documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-slate-500 text-sm">No documents yet. Upload a file or add a link above. At least one is required for verification.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc, index) => {
              const viewUrl = getDocumentViewUrl(doc.url);
              return (
                <li key={index} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-800/50 border border-slate-700/50">
                  <div>
                    <span className="font-medium text-slate-200">{doc.name}</span>
                    {viewUrl ? (
                      <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="block text-brand-400 text-sm hover:underline mt-0.5">
                        View document
                      </a>
                    ) : (
                      <span className="block text-slate-500 text-sm">No link</span>
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
