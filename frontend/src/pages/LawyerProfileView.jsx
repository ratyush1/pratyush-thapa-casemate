import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { getAssetUrl } from '../utils/media';

export default function LawyerProfileView() {
  const { id } = useParams();
  const [lawyer, setLawyer] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="card p-8 text-center">Loading...</div>;
  if (!lawyer) return <div className="card p-8 text-center">Lawyer not found.</div>;

  const docs = profile?.documents || [];
  const avatarUrl = getAssetUrl(lawyer.avatar);
  const availability = profile?.availability || null;
  const getViewUrl = (url) => {
    return getAssetUrl(url);
  };

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
    </div>
  );
}
