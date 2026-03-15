import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = () => {
      api.get('/admin/chats').then(({ data }) => {
        setChats(data.chats || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    const onRealtime = (event) => {
      const type = event?.detail?.type;
      if (['appointment_message', 'appointment_notification', 'appointment_updated', 'appointment_deleted'].includes(type)) {
        fetchChats();
      }
    };

    window.addEventListener('casemate:realtime', onRealtime);
    fetchChats();
    return () => window.removeEventListener('casemate:realtime', onRealtime);
  }, []);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <div key={chat._id} className="card-interactive p-5 border-slate-700/50">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">{chat.user?.name}</span> ({chat.user?.email}) · {chat.messagesCount || 0} messages
            {chat.escalationSuggested && <span className="text-amber-400 ml-1">· Escalation suggested</span>}
            {(chat.unreadForLawyer || chat.unreadForClient) && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white">Unread</span>
            )}
          </p>
          <div className="mt-3 rounded-xl bg-surface-900/50 p-3 border border-slate-800/80 text-sm text-slate-500">
            Message content is private and not visible to admin.
          </div>
        </div>
      ))}
      {chats.length === 0 && <div className="card p-8 text-center text-slate-500">No chats yet.</div>}
    </div>
  );
}
