import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatBot from '../../components/ChatBot';
import LawyerList from '../../components/LawyerList';
import AppointmentsList from '../../components/AppointmentsList';
import BookAppointment from '../../components/BookAppointment';
import ClientProfileEdit from '../../components/ClientProfileEdit';
import { useAuth } from '../../context/AuthContext';
import { getAssetUrl } from '../../utils/media';
import api from '../../api/axios';

const tabs = [
  { id: 'chat', label: 'Legal Chat', desc: 'Ask the AI' },
  { id: 'lawyers', label: 'Find Lawyers', desc: 'Book a consultation' },
  { id: 'appointments', label: 'My Appointments', desc: 'Track bookings' },
  { id: 'profile', label: 'Profile', desc: 'Edit your account' },
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const hasEsewaCallback = !!params.get('data') || ['success', 'failed'].includes(String(params.get('esewa') || '').toLowerCase());
    if (hasEsewaCallback) return 'chat';
    const tab = params.get('tab');
    return tabs.some((t) => t.id === tab) ? tab : 'chat';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [bookLawyer, setBookLawyer] = useState(null);
  const [recommendationContext, setRecommendationContext] = useState(null);
  const processedEsewaPayloadRef = useRef('');
  const avatar = getAssetUrl(user?.avatar) || '/favicon.svg';

  const handleBookLawyerFromChat = (context = {}) => {
    setRecommendationContext({
      caseSummary: String(context.caseSummary || '').trim(),
      caseArea: String(context.caseArea || '').trim(),
    });
    setActiveTab('lawyers');
  };

  const handleBookingDone = () => {
    setBookLawyer(null);
    setActiveTab('appointments');
  };

  useEffect(() => {
    const rawSearch = (location.search || '').replace(/^\?/, '');
    const normalizedSearch = rawSearch
      .replace('esewa=success?data=', 'esewa=success&data=')
      .replace('esewa=failed?data=', 'esewa=failed&data=');
    const params = new URLSearchParams(normalizedSearch);
    const tab = params.get('tab');
    const hasEsewaCallback = !!params.get('data') || ['success', 'failed'].includes(String(params.get('esewa') || '').toLowerCase());

    if (hasEsewaCallback) return;

    if (tabs.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const rawSearch = (location.search || '').replace(/^\?/, '');
    const normalizedSearch = rawSearch
      .replace('esewa=success?data=', 'esewa=success&data=')
      .replace('esewa=failed?data=', 'esewa=failed&data=');
    const params = new URLSearchParams(normalizedSearch);
    const rawEsewaState = String(params.get('esewa') || '').toLowerCase();
    let payload = params.get('data');
    let esewaState = rawEsewaState;

    if (!payload && rawEsewaState.includes('?data=')) {
      const [statePart, payloadPart] = rawEsewaState.split('?data=');
      esewaState = statePart;
      payload = payloadPart || '';
    }

    if (!esewaState && payload) {
      esewaState = 'success';
    }

    if (!esewaState) return;

    const clearEsewaQuery = () => {
      const cleaned = new URLSearchParams(normalizedSearch);
      cleaned.delete('esewa');
      cleaned.delete('data');
      cleaned.delete('tab');
      const cleanedSearch = cleaned.toString();
      navigate(`${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}`, { replace: true });
    };

    if (esewaState === 'failed') {
      alert('eSewa payment was cancelled or failed. Appointment remains unpaid.');
      clearEsewaQuery();
      return;
    }

    if (esewaState !== 'success' || !payload) {
      clearEsewaQuery();
      return;
    }

    if (processedEsewaPayloadRef.current === payload) {
      clearEsewaQuery();
      return;
    }

    processedEsewaPayloadRef.current = payload;

    const verifyPayment = async () => {
      try {
        await api.post('/payments/esewa/verify', { data: payload });
        setActiveTab('appointments');
        alert('Payment verified successfully.');
      } catch (e) {
        processedEsewaPayloadRef.current = '';
        alert(e.response?.data?.message || 'Payment verification failed. Appointment remains unpaid.');
      } finally {
        clearEsewaQuery();
      }
    };

    verifyPayment();
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card-glass p-6 md:p-8 border-brand-500/15 relative overflow-hidden">
        <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={avatar} alt="Client avatar" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-slate-600/60 shadow-lg shadow-black/30" />
            <div>
              <p className="chip mb-2">Client workspace</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">Welcome, {user?.name || 'Client'}</h1>
              <p className="text-slate-300 mt-1">Get legal guidance from AI, compare lawyers, and track your cases in one place.</p>
            </div>
          </div>
          <img src="/illustration-client.svg" alt="Client illustration" className="w-44 h-28 object-contain opacity-90" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-900/70 border border-slate-700/60 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-slate-900 shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'chat' && <ChatBot onBookLawyer={handleBookLawyerFromChat} />}
      {activeTab === 'lawyers' && (
        bookLawyer ? (
          <BookAppointment lawyer={bookLawyer} onDone={handleBookingDone} onBack={() => setBookLawyer(null)} />
        ) : (
          <LawyerList
            onSelect={(lawyer) => setBookLawyer(lawyer)}
            recommendationContext={recommendationContext}
          />
        )
      )}
      {activeTab === 'appointments' && <AppointmentsList />}
      {activeTab === 'profile' && <ClientProfileEdit />}
    </div>
  );
}
