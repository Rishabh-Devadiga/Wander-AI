import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Search, ArrowRight, AlertTriangle } from 'lucide-react';
import { TourFlowApi } from '../../services/api';
import type { Trip, TripMessageOverviewEntry } from '../../types/tourflow';
import { TripCommunicationsPanel } from './TripCommunicationsPanel';

interface OperatorCommunicationsProps {
  trips: Trip[];
  operatorName: string;
  initialTripId?: string | null;
  onSelectTrip: (tripId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  confirmed: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  ongoing: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  cancelled: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export const OperatorCommunications: React.FC<OperatorCommunicationsProps> = ({
  trips,
  operatorName,
  initialTripId,
  onSelectTrip,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialTripId || null);
  const [overview, setOverview] = useState<Record<string, TripMessageOverviewEntry>>({});
  const [overviewError, setOverviewError] = useState(false);

  useEffect(() => {
    setSelectedTripId(initialTripId || null);
  }, [initialTripId]);

  useEffect(() => {
    let cancelled = false;
    TourFlowApi.getTripMessagesOverview()
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, TripMessageOverviewEntry> = {};
        (rows || []).forEach((row) => {
          map[row.trip_id] = row;
        });
        setOverview(map);
      })
      .catch(() => {
        if (!cancelled) setOverviewError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTrips = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = (trips || []).filter((trip) => {
      if (!needle) return true;
      return (
        trip.id.toLowerCase().includes(needle) ||
        (trip.title || '').toLowerCase().includes(needle) ||
        (trip.destination?.name || '').toLowerCase().includes(needle) ||
        (trip.status || '').toLowerCase().includes(needle)
      );
    });
    // Trips with recent internal activity first; the rest keep portal order.
    return [...matches].sort((a, b) => {
      const aLatest = overview[a.id]?.latest_at || '';
      const bLatest = overview[b.id]?.latest_at || '';
      if (aLatest && bLatest) return bLatest.localeCompare(aLatest);
      if (aLatest) return -1;
      if (bLatest) return 1;
      return 0;
    });
  }, [trips, search, overview]);

  useEffect(() => {
    if (!selectedTripId && filteredTrips.length > 0 && !search.trim()) {
      setSelectedTripId(filteredTrips[0].id);
    }
  }, [filteredTrips, selectedTripId, search]);

  const selectedTrip = (trips || []).find((t) => t.id === selectedTripId) || null;
  const totalMessages = Object.values(overview).reduce((sum, e) => sum + (e.message_count || 0), 0);
  const totalUrgent = Object.values(overview).reduce((sum, e) => sum + (e.urgent_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Communications</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Internal operator log per trip. Traveler-invisible — nothing here reaches the Traveler Dashboard.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
            {totalMessages} Logged Messages
          </span>
          {totalUrgent > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold animate-pulse">
              {totalUrgent} Urgent
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left: searchable trip list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 lg:sticky lg:top-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="comms-trip-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Trip ID, title, destination…"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
          {overviewError && (
            <p className="text-[11px] text-amber-300/90 px-1">
              Message counts unavailable — trip list still works.
            </p>
          )}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredTrips.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                {search.trim() ? 'No trips match this search.' : 'No trips available yet.'}
              </div>
            ) : (
              filteredTrips.map((trip) => {
                const entry = overview[trip.id];
                const isActive = trip.id === selectedTripId;
                return (
                  <button
                    key={trip.id}
                    id={`comms-trip-${trip.id}`}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`w-full text-left rounded-xl p-3.5 border transition-colors ${
                      isActive
                        ? 'bg-emerald-600/15 border-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-sky-400 truncate">
                        #{trip.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                          STATUS_STYLES[trip.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {trip.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1 line-clamp-1">
                      {trip.title || 'Untitled trip'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                      <div>
                        {(trip.traveler_count || 0)} traveler{(trip.traveler_count || 0) === 1 ? '' : 's'}
                        {trip.travel_type ? ` (${trip.travel_type})` : ''} •{' '}
                        {trip.destination?.name || 'Destination TBD'}
                      </div>
                      <div className="text-slate-500">
                        {trip.formatted_dates || [trip.start_date, trip.end_date].filter(Boolean).join(' → ') || 'Dates TBD'}
                        {trip.duration_days ? ` • ${trip.duration_days} days` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                      {entry ? (
                        <>
                          <span className="text-slate-400">
                            {entry.message_count} message{entry.message_count === 1 ? '' : 's'}
                          </span>
                          {entry.urgent_count > 0 && (
                            <span className="flex items-center space-x-1 text-rose-300 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{entry.urgent_count} urgent</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600">No messages yet</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main: selected trip timeline */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-[540px]">
          {!selectedTrip ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-16">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
              <div className="font-bold text-white text-sm">Select a trip</div>
              <p className="text-xs mt-1">Choose a trip from the list to open its communication timeline.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-sky-400">#{selectedTrip.id}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[selectedTrip.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {selectedTrip.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">
                    {selectedTrip.title || 'Untitled trip'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedTrip.traveler_count || 0)} traveler{(selectedTrip.traveler_count || 0) === 1 ? '' : 's'}
                    {' • '}
                    {selectedTrip.destination?.name || 'Destination TBD'}
                    {' • '}
                    {selectedTrip.formatted_dates || 'Dates TBD'}
                  </p>
                </div>
                <button
                  id={`btn-open-workspace-from-comms-${selectedTrip.id}`}
                  onClick={() => onSelectTrip(selectedTrip.id)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
                >
                  <span>Open Trip Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <TripCommunicationsPanel
                key={selectedTrip.id}
                tripId={selectedTrip.id}
                operatorName={operatorName}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
