import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';

export default function AppointmentChat({ appointment, onClose }) {
  const [chat, setChat] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const messagesEnd = useRef(null);
  const [callActive, setCallActive] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/appointments/${appointment._id}/chat`);
      setChat(data.chat);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentDetails = async () => {
    try {
      const { data } = await api.get(`/appointments/${appointment._id}`);
      if (data && data.appointment) setAppointmentDetails(data.appointment);
    } catch (e) {
      console.error('fetchAppointmentDetails', e);
    }
  };

  const downloadDocument = async (appointmentId, doc, index) => {
    try {
      const rawDoc = typeof doc === 'string' ? doc : (doc?.url || '');
      if (/^https?:\/\//i.test(rawDoc)) {
        window.open(rawDoc, '_blank', 'noopener,noreferrer');
        return;
      }
      const fileName = rawDoc ? rawDoc.split('/').pop() : '';
      if (!fileName) {
        alert('Document not found');
        return;
      }
      const base = api.defaults.baseURL || '/api';
      const endpoint = `${base}/appointments/${appointmentId}/document/${encodeURIComponent(fileName)}`;
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        let message = 'Failed to download document';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch (e) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = decodeURIComponent(fileName) || `document-${index + 1}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Failed to download document');
    }
  };

  useEffect(() => {
    fetchChat();
    fetchAppointmentDetails();

    let socket = null;
    let setupSocket = false;

    // Function to set up socket listeners
    const setupSocketListeners = (sock) => {
      if (setupSocket) return; // Prevent duplicate listeners
      setupSocket = true;

      sock.on('connect', () => {
        console.log('Socket connected');
        setSocketConnected(true);
        // Join the appointment room
        sock.emit('joinAppointment', appointment._id);
        console.log('Joined appointment room:', appointment._id);
      });

      sock.on('disconnect', () => {
        console.log('Socket disconnected');
        setSocketConnected(false);
      });

      sock.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Listen for new messages from the other person
      sock.on('appointment_message', (payload) => {
        console.log('📨 Received message event:', payload);
        if (payload?.chat) {
          console.log('Updating chat with new message:', payload.chat.messages.length, 'messages');
          setChat(payload.chat);
          // Auto-scroll to newest message
          setTimeout(() => {
            if (messagesEnd.current) {
              messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      });

      sock.on('appointment_document', (payload) => {
        try {
          const aptId = payload?.appointmentId;
          const doc = payload?.document;
          if (!aptId || !doc) return;
          if (String(aptId) === String(appointment._id)) {
            setAppointmentDetails((a) => ({
              ...(a || {}),
              caseDocuments: [...((a && a.caseDocuments) || []), doc],
            }));
          }
        } catch (e) {
          console.error(e);
        }
      });
      sock.on('appointment_deleted', (payload) => {
        if (payload?.appointmentId === appointment._id) {
          alert('This appointment has been deleted');
          onClose();
        }
      });

      // WebRTC signaling handlers
      sock.on('webrtc:offer', async ({ offer }) => {
        try {
          console.log('📞 Incoming call offer received');
          incomingOfferRef.current = offer;
          setIncomingCall(true);
          setCallStatus('incoming');
          // Play notification sound if available
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
            audio.play().catch(() => {});
          } catch (e) {}
        } catch (e) {
          console.error('handleIncomingOffer', e);
        }
      });

      sock.on('webrtc:answer', async ({ answer }) => {
        try {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } catch (e) {
          console.error('setRemoteDescription(answer)', e);
        }
      });

      sock.on('webrtc:ice-candidate', async ({ candidate }) => {
        try {
          if (pcRef.current && candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error('addIceCandidate', e);
        }
      });

      sock.on('appointment_notification', (payload) => {
        try {
          console.info('appointment_notification', payload);
          if (!document.hasFocus()) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New appointment message', {
                body: payload.body || 'You have a new message',
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    // Create socket connection
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      socket = io(apiUrl || undefined, {
        path: '/socket.io',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: { token: localStorage.getItem('token') },
      });

      socketRef.current = socket;
      setupSocketListeners(socket);

      console.log('Socket.io initialized for appointment:', appointment._id);
    } catch (e) {
      console.error('Failed to initialize socket:', e);
    }

    // Set up polling as fallback (poll every 3 seconds)
    // This ensures messages are fetched even if socket.io isn't working
    pollIntervalRef.current = setInterval(() => {
      console.log('Polling for new messages...');
      fetchChat();
    }, 3000);

    // Cleanup function
    return () => {
      // Clear polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        console.log('Polling stopped');
      }
      
      try {
        if (socket) {
          socket.emit('leaveAppointment', appointment._id);
          socket.disconnect();
          console.log('Socket disconnected and cleaned up');
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }
      // cleanup peer and streams
      endCall();
    };
  }, [appointment._id]);

  useEffect(() => {
    if (messagesEnd.current) messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const ensureChat = async () => {
    try {
      const { data } = await api.post(`/appointments/${appointment._id}/chat`);
      setChat(data.chat);
    } catch (e) {
      console.error(e);
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    const messageToSend = text.trim();
    setText('');
    
    try {
      console.log('Sending message:', messageToSend);
      const { data } = await api.post(`/appointments/${appointment._id}/chat/messages`, { 
        content: messageToSend 
      });
      
      // Update local state immediately with response
      if (data && data.chat) {
        console.log('Message sent, updating chat. Total messages:', data.chat.messages.length);
        setChat(data.chat);
        
        // Scroll to bottom
        setTimeout(() => {
          if (messagesEnd.current) {
            messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } catch (e) {
      setText(messageToSend); // restore text on error
      console.error('Send message error:', e.response?.data || e.message);
      alert(e.response?.data?.message || 'Failed to send message');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // --- WebRTC helpers ---
  const createPeerConnection = () => {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    // optional TURN server from env (set VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS)
    if (import.meta.env.VITE_TURN_URL) {
      iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USER || undefined,
        credential: import.meta.env.VITE_TURN_PASS || undefined,
      });
    }
    const pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          socketRef.current.emit('webrtc:ice-candidate', { appointmentId: appointment._id, candidate: event.candidate });
        } catch (e) {}
      }
    };
    pc.ontrack = (ev) => {
      try {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0];
      } catch (e) {}
    };
    return pc;
  };

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connecting, active
  const incomingOfferRef = useRef(null);

  const toggleMute = () => {
    try {
      const stream = localStreamRef.current;
      if (!stream) return;
      stream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
      setIsMuted((v) => !v);
    } catch (e) { console.error('toggleMute', e); }
  };

  const toggleCamera = () => {
    try {
      const stream = localStreamRef.current;
      if (!stream) return;
      stream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOff; });
      setIsCameraOff((v) => !v);
    } catch (e) { console.error('toggleCamera', e); }
  };

  const acceptCall = async () => {
    try {
      if (!incomingOfferRef.current) return;
      const offer = incomingOfferRef.current;
      setIncomingCall(false);
      setCallStatus('connecting');
      await handleIncomingOffer(offer);
      setCallStatus('active');
    } catch (e) {
      console.error('Accept call error:', e);
      setCallStatus('idle');
      alert('Failed to accept call');
    }
  };

  const rejectCall = () => {
    try {
      setIncomingCall(false);
      incomingOfferRef.current = null;
      setCallStatus('idle');
      console.log('Call rejected');
    } catch (e) {
      console.error('Reject call error:', e);
    }
  };
  const startCall = async () => {
    if (callActive || callStatus !== 'idle') return;
    try {
      console.log('📞 Starting call...');
      setCallStatus('calling');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection();
      pcRef.current = pc;
      // add tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // send offer to other peer(s)
      console.log('📤 Sending offer...');
      socketRef.current.emit('webrtc:offer', { appointmentId: appointment._id, offer });
      setCallActive(true);
    } catch (e) {
      console.error('startCall', e);
      setCallStatus('idle');
      alert('Could not start call. Please allow camera/microphone access.');
    }
  };

  const handleIncomingOffer = async (offer) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('webrtc:answer', { appointmentId: appointment._id, answer });
      setCallActive(true);
    } catch (e) {
      console.error('handleIncomingOffer', e);
    }
  };

  const endCall = () => {
    try {
          console.log('📵 Ending call...');
          setCallActive(false);
          setCallStatus('idle');
          setIsMuted(false);
          setIsCameraOff(false);
          if (pcRef.current) {
            try { pcRef.current.close(); } catch (e) {}
            pcRef.current = null;
          }
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
          }
          if (localVideoRef.current) localVideoRef.current.srcObject = null;
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        } catch (e) { 
          console.error('endCall', e); 
        }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-4xl w-full card-glass overflow-hidden border-slate-700/60 shadow-panel">
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Chat about appointment</h3>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} title={socketConnected ? 'Connected' : 'Disconnected'} />
            </div>
            <p className="text-slate-400 text-sm">Lawyer: {appointment.lawyer?.name}</p>
            <p className="text-slate-400 text-sm">
              {new Date((appointmentDetails?.date || appointment.date)).toLocaleDateString()} · {appointmentDetails?.timeSlot || appointment.timeSlot}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => {
                console.log('Manually refreshing chat...');
                fetchChat();
              }} 
              className="btn-ghost text-sm"
              title="Refresh messages"
            >
              ↻
            </button>
            {callActive ? (
              <button type="button" onClick={endCall} className="btn-danger">End Call</button>
            ) : (
              <button type="button" onClick={startCall} className="btn-primary" disabled={appointmentDetails && appointmentDetails.status !== 'accepted'}>
                Start Call
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-ghost">Close</button>
          </div>
        </div>

        {incomingCall && !callActive && (
          <div className="p-4 border-b border-slate-800 bg-amber-900/20 border-amber-800/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
              <div>
                <p className="font-semibold text-white">Incoming video call</p>
                <p className="text-amber-200 text-sm">from {appointment.lawyer?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={acceptCall} 
                className="btn-primary text-sm"
              >
                Accept
              </button>
              <button 
                type="button" 
                onClick={rejectCall} 
                className="btn-danger text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {callActive && (
          <div className="border-b border-slate-800 bg-black overflow-hidden relative h-80">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className="absolute bottom-4 right-4 w-32 h-24 bg-black rounded-2xl border-2 border-slate-600 object-cover shadow-lg"
            />
            <div className="absolute top-4 left-4 bg-black/60 rounded-2xl px-3 py-2">
              <p className="text-white font-semibold text-sm">{callStatus === 'connecting' ? 'Connecting...' : 'In call'}</p>
              <p className="text-slate-300 text-xs">{appointment.lawyer?.name}</p>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-3">
              <button 
                type="button" 
                onClick={toggleMute}
                className={`btn text-sm px-4 py-2.5 ${isMuted ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
              >
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              <button 
                type="button" 
                onClick={toggleCamera}
                className={`btn text-sm px-4 py-2.5 ${isCameraOff ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
              >
                {isCameraOff ? '📹 Camera On' : '📹 Camera Off'}
              </button>
              <button 
                type="button" 
                onClick={endCall}
                className="btn-danger text-sm px-4 py-2.5"
              >
                ☎️ Hang Up
              </button>
            </div>
          </div>
        )}
        <div className="p-4 md:p-5 h-[400px] overflow-y-auto bg-surface-900/45">
          {loading && <p className="text-slate-400">Loading...</p>}
          {appointmentDetails && appointmentDetails.status !== 'accepted' && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-900/10 border border-amber-800/20 text-amber-200 text-sm">
              Video calls and chat are available once the appointment is accepted by the lawyer.
            </div>
          )}
          {appointmentDetails && (
            <div className="mb-4 p-4 rounded-[24px] bg-surface-800/80 border border-slate-700/80 text-sm text-slate-300">
              {appointmentDetails.caseDetails ? (
                <div className="mb-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Case details</div>
                  <div className="mt-1 whitespace-pre-wrap">{appointmentDetails.caseDetails}</div>
                </div>
              ) : null}
              {appointmentDetails.caseDocuments && appointmentDetails.caseDocuments.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Documents</div>
                  {appointmentDetails.caseDocuments.map((d, i) => {
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => downloadDocument(appointment._id, d, i)}
                        className="badge-neutral mr-2 mb-2 hover:text-white"
                      >
                        Document {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {!loading && !chat && (
            <div className="text-center">
              <p className="text-slate-400 mb-3">No chat yet for this appointment.</p>
              <button type="button" onClick={ensureChat} className="btn-primary">Start chat</button>
            </div>
          )}
          {chat && (
            <div className="space-y-3">
              {chat.messages.length === 0 && (
                <div className="text-center text-slate-400 py-4">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              {chat.messages.map((m, i) => {
                const meId = (JSON.parse(localStorage.getItem('user') || '{}').id) || null;
                const isMe = m.sender && meId && m.sender._id === meId;
                const senderRole = m.senderRole ? m.senderRole : (m.role === 'assistant' ? 'assistant' : 'system');
                const label = m.sender ? `${m.sender.name} (${senderRole})` : (m.role === 'assistant' ? 'Assistant' : 'System');
                const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-[22px] max-w-[75%] break-words shadow-sm ${isMe ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-slate-950' : 'bg-surface-800 text-slate-100 border border-slate-700/70'}`}>
                      <div className={`flex items-baseline justify-between gap-2 mb-1 ${isMe ? 'text-slate-900/70' : 'text-slate-400'}`}>
                        <div className="text-xs font-medium">{label}</div>
                        <div className="text-xs opacity-70">{time}</div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEnd} />
            </div>
          )}
        </div>
        <div className="p-4 md:p-5 border-t border-slate-800 flex gap-2 bg-surface-900/50">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (Shift+Enter for new line)" 
            className="input flex-1 rounded-xl" 
          />
          <button type="button" onClick={send} disabled={!text.trim()} className="btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
