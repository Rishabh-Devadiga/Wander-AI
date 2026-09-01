import React, { useState } from 'react';
import { 
  CalendarRange, 
  Search, 
  MapPin, 
  Users, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Car, 
  Compass, 
  Layers, 
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { Trip, ItineraryItem } from '../../types/tourflow';

interface OperatorItinerariesProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onOpenReplanForTrip: (tripId: string) => void;
}

export const OperatorItineraries: React.FC<OperatorItinerariesProps> = ({
  trips,
  onSelectTrip,
  onOpenReplanForTrip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '1024');

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const filteredTrips = trips.filter((t) => {
    return (
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Central Itinerary Manager</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              DYNAMIC SCHEDULES
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time day-by-day activity timelines, hotel nights, chauffeur legs, and instant AI replan triggers.
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          Total Managed Itineraries: <strong className="text-white">{trips.length}</strong>
        </div>
      </div>

      {/* Two column layout: Master list on left, detailed daily schedule on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Itinerary Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter itineraries..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredTrips.map((t) => {
              const isSelected = t.id === activeTrip?.id;
              const hasAlert = t.alerts?.some((a) => !a.is_resolved);
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-sky-400">#{t.id}</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'ongoing'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : t.status === 'confirmed'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">{t.title}</h4>
                  <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                    <span>{t.destination?.name} ({t.duration_days} Days)</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      ₹{(t.total_cost || t.total_budget || 0).toLocaleString()}
                    </span>
                  </div>

                  {hasAlert && (
                    <div className="mt-2 text-[10px] text-rose-300 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      <span>Has unresolved weather/schedule alert</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Itinerary Details */}
        {activeTrip ? (
          <div className="lg:col-span-8 space-y-4">
            {/* Itinerary Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-sky-400">TOUR #{activeTrip.id}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-medium">{activeTrip.origin} → {activeTrip.destination?.name}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{activeTrip.title}</h2>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                  <span>Dates: <strong className="text-white">{activeTrip.formatted_dates}</strong></span>
                  <span>•</span>
                  <span>Travelers: <strong className="text-white">{activeTrip.traveler_count} ({activeTrip.travel_type})</strong></span>
                  <span>•</span>
                  <span>Total: <strong className="text-emerald-400 font-mono">₹{(activeTrip.total_cost || activeTrip.total_budget || 0).toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  id={`btn-open-workspace-from-itinerary-${activeTrip.id}`}
                  onClick={() => onSelectTrip(activeTrip.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Open Full Tour Center</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Daily Timeline Manifest */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <CalendarRange className="w-4 h-4 text-sky-400" />
                <span>Day-by-Day Operations Manifest</span>
              </h3>

              <div className="space-y-3">
                {activeTrip.itinerary && activeTrip.itinerary.length > 0 ? (
                  activeTrip.itinerary.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`bg-slate-950 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        item.status === 'cancelled'
                          ? 'border-rose-900/50 bg-rose-950/10 opacity-70'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-emerald-400 flex-shrink-0">
                          Day {item.day_number}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {item.item_type}
                            </span>
                            {item.status && (
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  item.status === 'confirmed'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-white">{item.title}</div>
                          {item.description && (
                            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">{item.description}</p>
                          )}
                          {item.location && (
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-600" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-sm font-bold text-emerald-400">
                          ₹{(item.cost || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Allotment confirmed</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No itinerary items generated yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            Select an itinerary on the left to view daily operations schedule.
          </div>
        )}
      </div>
    </div>
  );
};
