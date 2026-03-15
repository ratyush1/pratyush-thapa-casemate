import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/media';

export default function LawyerProfileEdit() {
  const { user, refreshMe, deleteMyAccount } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', phone: '' });
  const [deleteForm, setDeleteForm] = useState({ confirmation: '', password: '' });
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    specialization: [],
    bio: '',
    hourlyRate: 0,
    experience: 0,
    barNumber: '',
    availability: { days: [], startTime: '09:00', endTime: '17:00' },
  });
  const navigate = useNavigate();

  const avatarPreview = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    api.get('/lawyers/me/profile')
      .then(({ data }) => {
        setProfile(data.profile);
        setForm({
          specialization: data.profile.specialization || [],
          bio: data.profile.bio || '',
          hourlyRate: data.profile.hourlyRate || 0,
          experience: data.profile.experience || 0,
          barNumber: data.profile.barNumber || '',
          availability: data.profile.availability || { days: [], startTime: '09:00', endTime: '17:00' },
        });
      })
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setAccountForm({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  const addSpec = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const val = input.value.trim();
      if (val && !form.specialization.includes(val)) {
        setForm((f) => ({ ...f, specialization: [...f.specialization, val] }));
        input.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [{ data }] = await Promise.all([
        api.put('/lawyers/me/profile', form),
        api.put('/auth/me', accountForm),
      ]);
      setProfile(data.profile);
      await refreshMe();
      // after saving, go to view page
      navigate('/lawyer/profile');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) return alert('Please select an avatar image.');
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      await api.post('/auth/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshMe();
      setAvatarFile(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Avatar upload failed. Max 5MB. Allowed: JPEG, PNG, GIF, WebP.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteForm.confirmation !== 'DELETE') {
      alert('Type DELETE exactly to confirm account deletion.');
      return;
    }
    const confirmed = window.confirm('Are you sure? This will permanently delete your account and all related data.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteMyAccount(deleteForm);
      alert('Your account has been deleted.');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="card p-6 md:p-8 max-w-2xl border-slate-700/50">
      <h2 className="font-display text-xl font-bold text-white mb-6">Edit profile</h2>
      <div className="flex items-center gap-5 mb-6">
        <img src={avatarPreview || getAssetUrl(user?.avatar) || '/favicon.svg'} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" />
        <div>
          <p className="text-slate-300 text-sm">Selected profile picture preview</p>
          <p className="text-slate-500 text-xs">Save upload to apply it across the app.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Full name</label>
          <input type="text" className="input rounded-xl" value={accountForm.name} onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input rounded-xl" value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="label">Phone</label>
          <input type="text" className="input rounded-xl" value={accountForm.phone} onChange={(e) => setAccountForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Optional" />
        </div>
        <div>
          <label className="label">Specialization (type and press Enter)</label>
          <input type="text" className="input rounded-xl" placeholder="e.g. Family Law" onKeyDown={addSpec} />
          <div className="flex flex-wrap gap-2 mt-2">
            {form.specialization.map((s) => (
              <span key={s} className="bg-surface-800 text-slate-200 px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5 border border-slate-700/50">
                {s}
                <button type="button" onClick={() => setForm((f) => ({ ...f, specialization: f.specialization.filter((x) => x !== s) }))} className="hover:text-red-400 text-slate-400">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Bar number</label>
          <input type="text" className="input rounded-xl" value={form.barNumber} onChange={(e) => setForm((f) => ({ ...f, barNumber: e.target.value }))} />
        </div>
        <div>
          <label className="label">Profile picture</label>
          <input type="file" accept="image/*" className="input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          {avatarFile && <p className="text-slate-400 text-sm mt-2">Selected: {avatarFile.name}</p>}
          <div className="mt-2">
            <button type="button" className="btn-ghost" onClick={uploadAvatar} disabled={uploadingAvatar}>{uploadingAvatar ? 'Uploading...' : 'Upload profile picture'}</button>
          </div>
        </div>
        <div>
          <label className="label">Availability</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <label key={d} className={`px-3 py-1 rounded-xl cursor-pointer ${form.availability.days.includes(d) ? 'bg-brand-500 text-white' : 'bg-surface-800 text-slate-400'}`}>
                <input type="checkbox" className="hidden" checked={form.availability.days.includes(d)} onChange={() => setForm((f) => ({ ...f, availability: { ...f.availability, days: f.availability.days.includes(d) ? f.availability.days.filter(x => x !== d) : [...f.availability.days, d] } }))} />
                {d}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <div>
              <label className="label">Start time</label>
              <input type="time" className="input rounded-xl" value={form.availability.startTime} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, startTime: e.target.value } }))} />
            </div>
            <div>
              <label className="label">End time</label>
              <input type="time" className="input rounded-xl" value={form.availability.endTime} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, endTime: e.target.value } }))} />
            </div>
          </div>
        </div>
        <div>
          <label className="label">Experience (years)</label>
          <input type="number" className="input rounded-xl" min={0} value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: Number(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[100px] rounded-xl" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Hourly rate (NPR)</label>
          <input type="number" className="input rounded-xl" min={0} step={10} value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) || 0 }))} />
        </div>
        <button type="submit" className="btn-primary rounded-xl" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-red-900/40 space-y-3">
        <h3 className="text-red-300 font-semibold">Delete account</h3>
        <p className="text-slate-400 text-sm">This action is permanent and removes all your related data from the system.</p>
        <form onSubmit={handleDeleteAccount} className="space-y-3">
          <div>
            <label className="label">Type DELETE to confirm</label>
            <input
              type="text"
              className="input rounded-xl"
              value={deleteForm.confirmation}
              onChange={(e) => setDeleteForm((f) => ({ ...f, confirmation: e.target.value }))}
              placeholder="DELETE"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input rounded-xl"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-ghost border border-red-800/70 text-red-300 hover:bg-red-900/20" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete my account'}
          </button>
        </form>
      </div>
    </div>
  );
}
