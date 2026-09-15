import React, { useState, useEffect } from 'react';
import {
  X, FolderOpen, MapPin, Calendar, RefreshCw, AlertCircle, LogIn, CheckCircle2,
} from 'lucide-react';
import { TourFlowApi } from '../services/api';
import { useTravelerAuth } from '../store/useTravelerAuth';
import type { Trip, TravelerTripSummary } from '../types/tourflow';

interface TravelerMyTripsProps {
  open: boolean;
  onClose: () => void;
  onOpenTrip: (trip: Trip) => void;
  currentTripId?: string | null;
}

/**
 * Slide-over "My Trips" panel for the MAIN TourFlow experience.
 * Lists the traveler's persisted snapshots and opens one by restoring it
 * into the engine — itineraries are never regenerated here.
 */
export default function TravelerMyTrips({ open, onClose, onOpenTrip, currentTripId }: TravelerMyTripsProps) {
  const travelerUser = useTravelerAuth((s) => s.user);
  const openAuthModal = useTravelerAuth((s) => s.openAuthModal);
  const [trips, setTrips] = useState<TravelerTripSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchTrips = async () => {
    if (!travelerUser) return;
    setLoading(true);
    setError(null);
    try {
      setTrips(await TourFlowApi.getMyTrips());
    } catch (err: any) {
      setError(err?.message || 'Could not load saved trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, travelerUser?.id ]);

  if (!open) return null;

  const handleOpen = async (tripId: string) => {
    if (openingId) return;
    setOpeningId(tripId);
    try {
      const snapshot = await TourFlowApi.getMyTrip(tripId);
      const restored = await TourFlowApi.restoreTrip(snapshot);
      onOpenTrip(restored);
    } catch (err: any) {
      setError(err?.message || 'Could not open this trip.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-stone-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white shadow-2xl border-l border-stone-200 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display text-lg font-black text-stone-900">My Trips</h2>
            <p className="text-[11px] text-stone-500 font-medium">
              {travelerUser ? `Saved to ${travelerUser.email}` : 'Your saved itineraries'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close My Trips"
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!travelerUser ? (
            <div className="text-center py-10 space-y-3">
              <FolderOpen className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs text-stone-600 leading-relaxed max-w-[260px] mx-auto">
                Sign in to save trips to your account and reopen them on any visit. Anonymous trips keep working.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          ) : loading && trips.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-rose-500 mx-auto" />
              <p className="text-xs font-bold text-stone-600">Loading saved trips…</p>
            </div>
          ) : error && trips.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-xs text-stone-600">{error}</p>
              <button onClick={fetchTrips} className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                Retry
              </button>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-stone-300 mx-auto" />
              <p className="text-xs font-bold text-stone-700">No saved trips yet</p>
              <p className="text-[11px] text-stone-500">New trips save here automatically while signed in.</p>
            </div>
          ) : (
            trips.map((saved) => (
              <div
                key={saved.trip_id}
                className={`p-4 rounded-2xl border transition-colors ${
                  currentTripId === saved.trip_id
                    ? 'bg-rose-50/80 border-rose-300'
                    : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-stone-500 truncate" title={saved.trip_id}>
                    #{saved.trip_id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${
                    saved.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {saved.status || 'planning'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 line-clamp-1 mt-1">
                  {saved.title || 'Untitled trip'}
                </h4>
                <div className="text-[11px] text-stone-600 mt-1 space-y-0.5 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">{saved.destination || 'Destination TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">
                      {saved.formatted_dates || [saved.start_date, saved.end_date].filter(Boolean).join(' → ') || 'Dates TBD'}
                      {saved.duration_days ? ` • ${saved.duration_days} days` : ''}
                    </span>
                  </div>
                  {saved.updated_at && (
                    <div className="text-stone-400">
                      Updated {new Date(saved.updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleOpen(saved.trip_id)}
                  disabled={openingId === saved.trip_id}
                  className="mt-2.5 w-full py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {openingId === saved.trip_id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening…</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{currentTripId === saved.trip_id ? 'Reopen Trip' : 'Open Trip'}</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
          {error && trips.length > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
