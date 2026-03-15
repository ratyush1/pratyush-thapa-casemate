import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const roleBadgeClass = {
  client: 'badge-info',
  lawyer: 'badge-success',
  admin: 'badge-warning',
};

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">User management</p>
          <h2 className="mt-2 section-title">Accounts</h2>
          <p className="mt-2 text-sm text-slate-400">Filter by role and activate or deactivate accounts without leaving the dashboard.</p>
        </div>
        <select className="input w-auto max-w-[180px] rounded-xl" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="nonadmin">Clients & Lawyers</option>
          <option value="">All roles</option>
          <option value="client">Client</option>
          <option value="lawyer">Lawyer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="table-shell">
        <div className="table-wrap">
          <table className="table-base">
          <thead className="table-head">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="table-row">
                <td>
                  <div className="font-semibold text-white">{u.name}</div>
                </td>
                <td className="text-slate-400">{u.email}</td>
                <td>
                  <span className={roleBadgeClass[u.role] || 'badge-neutral'}>{u.role}</span>
                </td>
                <td>{u.isActive ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span>}</td>
                <td>
                  <button type="button" onClick={() => toggleActive(u)} className="btn-ghost text-sm rounded-xl">
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {users.length === 0 && <div className="p-8 text-center text-slate-500">No users found for the selected filter.</div>}
      </div>
    </div>
  );
}
