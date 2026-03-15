import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/media';
import { useNavigate } from 'react-router-dom';

export default function ClientProfileEdit() {
  const { user, refreshMe, deleteMyAccount } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [deleteForm, setDeleteForm] = useState({ confirmation: '', password: '' });
  const [deleting, setDeleting] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
    });
  }, [user]);

  const previewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true);
      try {
        const { data } = await api.get('/payments');
        setPayments(data?.payments || []);
      } catch (err) {
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, []);

  const currentAvatar = getAssetUrl(user?.avatar) || '/favicon.svg';

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', form);
      await refreshMe();
      alert('Profile updated');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) return alert('Please select a profile picture first');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      await api.post('/auth/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshMe();
      setAvatarFile(null);
      alert('Profile picture updated');
    } catch (err) {
      alert(err.response?.data?.message || 'Avatar upload failed. Max 5MB. Allowed: JPEG, PNG, GIF, WebP.');
    } finally {
      setUploading(false);
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

  const buildReceiptHtml = (payment) => {
    const appointment = payment?.appointment || {};
    const receiptId = payment?.metadata?.receiptId || `RCPT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
    const paidAt = payment?.metadata?.paidAt || payment?.updatedAt || payment?.createdAt;
    const appointmentDate = appointment?.date ? new Date(appointment.date).toLocaleString() : 'N/A';
    const transactionId = payment?.transactionId || 'N/A';
    const amount = Number(payment?.amount || appointment?.amount || 0).toFixed(2);
    const customer = appointment?.client?.name || user?.name || 'Client';
    const lawyerName = appointment?.lawyer?.name || 'N/A';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CaseMate Payment Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
      .wrap { max-width: 700px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      .muted { color: #6b7280; margin-bottom: 20px; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
      .row:last-child { border-bottom: none; }
      .k { font-weight: 600; }
      .amount { font-size: 22px; font-weight: 700; color: #0f766e; }
      .actions { margin-top: 20px; }
      button { padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: #fff; cursor: pointer; }
      @media print { .actions { display: none; } body { margin: 0; } .wrap { border: none; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Payment Receipt</h1>
      <div class="muted">CaseMate - eSewa Payment</div>
      <div class="row"><div class="k">Receipt ID</div><div>${receiptId}</div></div>
      <div class="row"><div class="k">Transaction ID</div><div>${transactionId}</div></div>
      <div class="row"><div class="k">Payment Method</div><div>${String(payment?.method || 'esewa').toUpperCase()}</div></div>
      <div class="row"><div class="k">Paid By</div><div>${customer}</div></div>
      <div class="row"><div class="k">Lawyer</div><div>${lawyerName}</div></div>
      <div class="row"><div class="k">Appointment Date</div><div>${appointmentDate}</div></div>
      <div class="row"><div class="k">Paid At</div><div>${paidAt ? new Date(paidAt).toLocaleString() : 'N/A'}</div></div>
      <div class="row"><div class="k">Status</div><div>Completed</div></div>
      <div class="row"><div class="k">Amount</div><div class="amount">NPR ${amount}</div></div>
      <div class="actions"><button onclick="window.print()">Print Receipt</button></div>
    </div>
  </body>
</html>`;
  };

  const viewReceipt = (payment) => {
    const popup = window.open('', '_blank', 'width=820,height=900');
    if (!popup) {
      alert('Popup blocked. Please allow popups to view receipt.');
      return;
    }
    popup.document.write(buildReceiptHtml(payment));
    popup.document.close();
  };

  const downloadReceipt = (payment) => {
    const receiptId = payment?.metadata?.receiptId || `RCPT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
    const html = buildReceiptHtml(payment);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receiptId}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const completedPayments = payments.filter((p) => p?.status === 'completed');

  return (
    <div className="card p-6 md:p-8 max-w-2xl border-slate-700/50">
      <h2 className="font-display text-xl font-bold text-white mb-6">Edit profile</h2>

      <div className="flex items-center gap-5 mb-6">
        <img src={previewUrl || currentAvatar} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" />
        <div>
          <p className="text-slate-300 text-sm">Selected profile picture preview</p>
          <p className="text-slate-500 text-xs">Save after selecting to apply it globally.</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-5">
        <div>
          <label className="label">Full name</label>
          <input
            type="text"
            className="input rounded-xl"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input rounded-xl" value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="text"
            className="input rounded-xl"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <button type="submit" className="btn-primary rounded-xl" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
        <label className="label">Profile picture</label>
        <input type="file" accept="image/*" className="input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        {avatarFile && <p className="text-slate-400 text-sm">Selected: {avatarFile.name}</p>}
        <button type="button" className="btn-ghost" onClick={uploadAvatar} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload profile picture'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700/50 space-y-3">
        <h3 className="text-white font-semibold">Payment receipts</h3>
        <p className="text-slate-400 text-sm">View or download receipts for completed payments.</p>
        {loadingPayments && <p className="text-slate-400 text-sm">Loading receipts...</p>}
        {!loadingPayments && completedPayments.length === 0 && (
          <p className="text-slate-500 text-sm">No completed payments yet.</p>
        )}
        {!loadingPayments && completedPayments.length > 0 && (
          <div className="space-y-3">
            {completedPayments.map((payment) => {
              const receiptId = payment?.metadata?.receiptId || `RCPT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
              const paidAt = payment?.metadata?.paidAt || payment?.updatedAt || payment?.createdAt;
              const lawyerName = payment?.appointment?.lawyer?.name || 'Lawyer';
              const amount = Number(payment?.amount || 0).toFixed(2);
              return (
                <div key={payment._id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{receiptId}</p>
                    <p className="text-xs text-slate-400 mt-1">Lawyer: {lawyerName}</p>
                    <p className="text-xs text-slate-400">Paid At: {paidAt ? new Date(paidAt).toLocaleString() : 'N/A'}</p>
                    <p className="text-xs text-slate-300">Amount: NPR {amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary rounded-lg" onClick={() => viewReceipt(payment)}>
                      View receipt
                    </button>
                    <button type="button" className="btn-ghost border border-slate-600 rounded-lg" onClick={() => downloadReceipt(payment)}>
                      Download receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
