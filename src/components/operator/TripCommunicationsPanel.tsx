import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ClipboardList,
  Building2,
  Car,
  Compass,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { TourFlowApi } from '../../services/api';
import {
  TripMessage,
  TripMessageCategory,
  TRIP_MESSAGE_CATEGORIES,
} from '../../types/tourflow';

interface TripCommunicationsPanelProps {
  tripId: string;
  operatorName: string;
}

const CATEGORY_META: Record<TripMessageCategory, { label: string; icon: any; badge: string }> = {
  general: {
    label: 'General',
    icon: MessageSquare,
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
  operational: {
    label: 'Operational',
    icon: ClipboardList,
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  hotel: {
    label: 'Hotel',
    icon: Building2,
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  transport: {
    label: 'Transport',
    icon: Car,
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  activity: {
    label: 'Activity',
    icon: Compass,
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export const TripCommunicationsPanel: React.FC<TripCommunicationsPanelProps> = ({
  tripId,
  operatorName,
}) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [activeCategory, setActiveCategory] = useState<TripMessageCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [draftCategory, setDraftCategory] = useState<TripMessageCategory>('general');
  const [draftUrgent, setDraftUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const loadMessages = async (category: TripMessageCategory | 'all') => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await TourFlowApi.getTripMessages(
        tripId,
        category === 'all' ? undefined : category,
      );
      setMessages(rows || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load messages for this trip.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setActiveCategory('all');
    setDraft('');
    setDraftCategory('general');
    setDraftUrgent(false);
    setSendError(null);
    setSendSuccess(false);
    loadMessages('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSelectCategory = (category: TripMessageCategory | 'all') => {
    setActiveCategory(category);
    loadMessages(category);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const created = await TourFlowApi.createTripMessage(tripId, {
        operator_name: operatorName,
        category: draftCategory,
        body,
        is_urgent: draftUrgent || draftCategory === 'urgent',
      });
      // Keep the visible timeline consistent with the active filter.
      if (activeCategory === 'all' || activeCategory === created.category) {
        setMessages((prev) => [...prev, created]);
      } else {
        await loadMessages(activeCategory);
      }
      setDraft('');
      setDraftUrgent(false);
      setSendSuccess(true);
      window.setTimeout(() => setSendSuccess(false), 4000);
    } catch (err: any) {
      setSendError(err?.message || 'Message could not be sent. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3">
        <FilterChip
          active={activeCategory === 'all'}
          label="All"
          onClick={() => handleSelectCategory('all')}
        />
        {TRIP_MESSAGE_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            active={activeCategory === category}
            label={CATEGORY_META[category].label}
            onClick={() => handleSelectCategory(category)}
          />
        ))}
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="flex-1 min-h-[280px] max-h-[460px] overflow-y-auto space-y-3 pr-1"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading messages…
          </div>
        ) : loadError ? (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-6 h-6 text-rose-300 mx-auto mb-2" />
            <div className="font-bold text-white text-sm">Messages unavailable</div>
            <p className="text-xs text-slate-300 mt-1">{loadError}</p>
            <button
              onClick={() => loadMessages(activeCategory)}
              className="mt-3 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="font-bold text-white text-sm">No messages yet</div>
            <p className="text-xs mt-1">
              {activeCategory === 'all'
                ? 'Start the internal log for this trip with the composer below.'
                : `No ${CATEGORY_META[activeCategory as TripMessageCategory].label.toLowerCase()} messages for this trip yet.`}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const meta = CATEGORY_META[message.category] || CATEGORY_META.general;
            const Icon = meta.icon;
            return (
              <div
                key={message.id}
                className={`rounded-2xl p-4 border ${
                  message.is_urgent
                    ? 'bg-rose-950/30 border-rose-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-200">
                      {(message.operator_name || 'O').trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-white">{message.operator_name}</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${meta.badge}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </span>
                    {message.is_urgent && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/40 animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed mt-2 whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          New Message
        </div>
        <textarea
          id={`comms-composer-${tripId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={`Log an internal note for trip #${tripId}… (traveler-invisible)`}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-y"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Message category"
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as TripMessageCategory)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
          >
            {TRIP_MESSAGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].label}
              </option>
            ))}
          </select>
          <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draftUrgent}
              onChange={(e) => setDraftUrgent(e.target.checked)}
              className="w-3.5 h-3.5 accent-rose-500"
            />
            <span>Mark as urgent</span>
          </label>
          <span className="text-[11px] text-slate-500 font-mono ml-auto">
            {draft.trim().length}/2000
          </span>
          <button
            id={`btn-send-message-${tripId}`}
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition-colors"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSending ? 'Sending…' : 'Send'}</span>
          </button>
        </div>
        {sendError && (
          <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
            {sendError}
          </p>
        )}
        {sendSuccess && (
          <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Message sent to the trip log.</span>
          </p>
        )}
      </div>
    </div>
  );
};

const FilterChip: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors ${
      active
        ? 'bg-emerald-600 text-white border-emerald-500'
        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
    }`}
  >
    {label}
  </button>
);
