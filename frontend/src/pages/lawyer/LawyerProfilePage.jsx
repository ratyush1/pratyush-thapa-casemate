import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getAssetUrl } from '../../utils/media';

export default function LawyerProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchProfile = () => {
      api.get('/lawyers/me/profile')
        .then(({ data }) => { if (!mounted) return; setProfile(data.profile || {}); })
        .catch(() => { if (!mounted) return; setProfile({}); })
        .finally(() => { if (mounted) setLoading(false); });
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
    return () => {
      mounted = false;
      window.removeEventListener('casemate:realtime', onRealtime);
    };
  }, [user?.id]);

  if (loading) return <div className="card p-8 text-center">Loading...</div>;

  const avatarUrl = getAssetUrl(user?.avatar) || '/favicon.svg';

  return (
    <div className="space-y-6">
      <div className="card-glass p-6 md:p-8 border-brand-500/15">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <img src={avatarUrl} alt="Lawyer profile" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" />
            <div>
              <h1 className="section-title">Your profile</h1>
              <p className="text-slate-400 mt-1">Manage your public profile shown to clients.</p>
            </div>
          </div>
          <img src="/illustration-lawyer.svg" alt="Lawyer illustration" className="w-40 h-24 object-contain opacity-90" />
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost" onClick={() => navigate('/lawyer/profile/edit')}>Edit profile</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="metric-card">
          <h3 className="font-semibold text-white mb-3">Overview</h3>
          <p className="text-slate-400">Specialization: {profile.specialization?.join(', ') || '—'}</p>
          <p className="text-slate-500 mt-2 leading-relaxed">{profile.bio || 'No bio yet.'}</p>
          <p className="text-brand-300 font-semibold mt-4">NPR {profile.hourlyRate || 0}/hr</p>
        </div>

        <div className="metric-card">
          <h3 className="font-semibold text-white mb-3">Availability</h3>
          <p className="text-slate-400">Days: {profile.availability?.days?.join(', ') || '—'}</p>
          <p className="text-slate-400 mt-2">Time: {profile.availability?.startTime || '—'} {profile.availability?.endTime ? `- ${profile.availability.endTime}` : ''}</p>
        </div>
      </div>

      <div className="card-glass p-6">
        <h3 className="font-semibold text-white mb-3">Documents</h3>
        {profile.documents?.length ? (
          <ul className="space-y-2">
            {profile.documents.map((d, i) => (
              <li key={i} className="flex items-center justify-between rounded-[22px] border border-slate-700/60 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="font-medium text-white">{d.name}</div>
                  {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-brand-400">View</a> : <div className="text-sm text-slate-500">No link</div>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No documents uploaded.</p>
        )}
      </div>
    </div>
  );
}
