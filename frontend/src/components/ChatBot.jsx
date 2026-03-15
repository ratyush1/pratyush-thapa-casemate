import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Hello! I'm CaseMate's legal AI assistant. I can help you understand your legal situation under Nepal law.

To give you the most relevant guidance, please describe your case — for example:
• "My employer terminated me without notice or severance pay."
• "My landlord is threatening to evict me without proper notice."
• "I want to file for divorce and need to know about child custody."
• "Someone filed a false FIR against me."

The more details you share about your situation, the more specific guidance I can provide.`,
};

function AssistantMessage({ content }) {
  const paragraphs = (content || '').split('\n').filter((line) => line.trim() !== '');
  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {paragraphs.map((line, i) => {
        if (line.startsWith('Note:') || line.startsWith('⚠')) {
          return (
            <p key={i} className="text-slate-400 text-xs italic border-t border-slate-700/50 pt-2 mt-2">
              {line}
            </p>
          );
        }
        if (line.startsWith('•')) {
          return (
            <p key={i} className="pl-3 border-l-2 border-brand-500/40 text-slate-300">
              {line}
            </p>
          );
        }
        if (line.match(/^(Immediate next steps:|Based on|To give you|Hello!)/)) {
          return <p key={i} className="font-medium text-slate-100">{line}</p>;
        }
        return <p key={i} className="text-slate-200">{line}</p>;
      })}
    </div>
  );
}

export default function ChatBot({ onBookLawyer }) {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [input, setInput] = useState('');
  const [caseOptions, setCaseOptions] = useState({});
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    api.get('/chat').then(({ data }) => {
      setChats(data.chats || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/chat/case-options').then(({ data }) => {
      if (data?.success && data?.cases) setCaseOptions(data.cases);
    }).catch(() => setCaseOptions({}));
  }, []);

  useEffect(() => { scrollToBottom(); }, [currentChat?.messages]);

  const createChat = () => {
    setSending(true);
    api.post('/chat').then(({ data }) => {
      const chatWithWelcome = { ...data.chat, messages: [WELCOME_MESSAGE, ...(data.chat.messages || [])] };
      setChats((c) => [chatWithWelcome, ...c]);
      setCurrentChat(chatWithWelcome);
      setSending(false);
    }).catch(() => setSending(false));
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !currentChat || sending) return;
    setInput('');
    setSending(true);
    const userMsg = { role: 'user', content: text };
    setCurrentChat((c) => c ? { ...c, messages: [...(c.messages || []), userMsg] } : c);
    api.post(`/chat/${currentChat._id}/message`, { content: text, selectedCaseId: selectedCaseId || undefined }).then(({ data }) => {
      setCurrentChat((c) => c ? { ...c, messages: [...(c.messages || []), data.assistantMessage] } : c);
      setChats((list) =>
        list.map((ch) => (ch._id === currentChat._id ? { ...ch, messages: [...(ch.messages || []), userMsg, data.assistantMessage] } : ch))
      );
      setSending(false);
    }).catch(() => setSending(false));
  };

  const buildRecommendationContext = () => {
    const recentUserMessage = [...(currentChat?.messages || [])]
      .reverse()
      .find((msg) => msg?.role === 'user' && String(msg?.content || '').trim())?.content || '';

    let selectedArea = '';
    if (selectedCaseId) {
      for (const [area, options] of Object.entries(caseOptions || {})) {
        if ((options || []).some((option) => option.id === selectedCaseId)) {
          selectedArea = area;
          break;
        }
      }
    }

    return {
      caseSummary: recentUserMessage,
      caseArea: selectedArea,
    };
  };

  const openChat = (chat) => setCurrentChat(chat);
  const caseAreaKeys = Object.keys(caseOptions || {});

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[320px]">
        <p className="text-slate-400">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden flex flex-col md:flex-row border-slate-700/50 min-h-[420px]">
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col bg-surface-900/30">
        <div className="p-4 border-b border-slate-800/80 flex justify-between items-center">
          <span className="font-semibold text-slate-200">Conversations</span>
          <button type="button" onClick={createChat} className="btn-primary text-sm py-2 px-4 rounded-xl" disabled={sending}>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && !currentChat && (
            <p className="p-4 text-slate-500 text-sm">No conversations yet. Start a new chat to ask legal questions.</p>
          )}
          {chats.map((ch) => (
            <button
              key={ch._id}
              type="button"
              onClick={() => openChat(ch)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-slate-800/50 hover:bg-white/5 transition-colors ${
                currentChat?._id === ch._id ? 'bg-brand-500/15 text-brand-400 border-l-2 border-l-brand-500 md:border-l-0' : 'text-slate-300'
              }`}
            >
              <span className="truncate block">{ch.title || 'New chat'}</span>
              {ch.escalationSuggested && <span className="text-amber-400 text-xs"> · Suggest lawyer</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-[320px] bg-surface-950/30">
        {!currentChat ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-slate-400 mb-2">Select a conversation or start a new one.</p>
              <p className="text-slate-500 text-sm">Ask legal questions here. If the AI suggests it, use the Find Lawyers tab to book a consultation.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {currentChat.messages?.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                        : 'bg-surface-800/80 text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <AssistantMessage content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    )}
                    {msg.escalationSuggested && (
                      <button
                        type="button"
                        onClick={() => onBookLawyer?.(buildRecommendationContext())}
                        className="mt-3 text-xs font-semibold text-brand-300 hover:text-brand-200 underline underline-offset-2"
                      >
                        Book a lawyer →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-800/80 flex gap-3 bg-surface-900/30 items-end">
              <div className="flex-1 space-y-2">
                <label className="block text-xs text-slate-400">Choose your case type (optional, from legal docs)</label>
                <select
                  className="input w-full rounded-xl"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                >
                  <option value="">Auto-detect from your message</option>
                  {caseAreaKeys.map((area) => (
                    <optgroup key={area} label={area.charAt(0).toUpperCase() + area.slice(1)}>
                      {(caseOptions[area] || []).map((option) => (
                        <option key={option.id} value={option.id}>{option.title}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <textarea
                  rows={2}
                  placeholder="Describe your legal situation in detail..."
                  className="input flex-1 rounded-xl resize-none w-full"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                />
              </div>
              <button type="button" onClick={sendMessage} className="btn-primary rounded-xl px-5 py-3" disabled={sending || !input.trim()}>
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
