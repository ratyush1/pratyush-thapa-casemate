import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('nonadmin');

  useEffect(() => {
    const fetchUsers = () => {
      let params = {};
      if (roleFilter === 'nonadmin') {
        params = { excludeAdmin: 'true' };
      } else if (roleFilter) {
        params = { role: roleFilter };
      }
      api.get('/admin/users', { params }).then(({ data }) => {
        setUsers(data.users || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      if (type === 'user_updated' || type === 'lawyer_updated') {
        fetchUsers();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);

    fetchUsers();

    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, [roleFilter]);

  const toggleActive = async (user) => {
    try {
      const { data } = await api.patch(`/admin/users/${user._id}`, { isActive: !user.isActive });
      setUsers((list) => list.map((u) => (u._id === user._id ? data.user : u)));
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed');
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
      <div className="flex gap-3">
        <select className="input w-auto max-w-[180px] rounded-xl" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="nonadmin">Clients & Lawyers</option>
          <option value="">All roles</option>
          <option value="client">Client</option>
          <option value="lawyer">Lawyer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="card overflow-hidden border-slate-700/50">
        <table className="w-full text-left">
          <thead className="bg-surface-800/80">
            <tr>
              <th className="p-4 text-slate-300 font-medium text-sm">Name</th>
              <th className="p-4 text-slate-300 font-medium text-sm">Email</th>
              <th className="p-4 text-slate-300 font-medium text-sm">Role</th>
              <th className="p-4 text-slate-300 font-medium text-sm">Active</th>
              <th className="p-4 text-slate-300 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-slate-800/80 hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-white font-medium">{u.name}</td>
                <td className="p-4 text-slate-400">{u.email}</td>
                <td className="p-4 text-slate-400 capitalize">{u.role}</td>
                <td className="p-4">{u.isActive ? <span className="text-emerald-400">Yes</span> : <span className="text-slate-500">No</span>}</td>
                <td className="p-4">
                  <button type="button" onClick={() => toggleActive(u)} className="btn-ghost text-sm rounded-xl">
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
