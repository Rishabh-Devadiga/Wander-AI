import React, { useState } from 'react';
import { 
  Inbox, 
  Search, 
  UserCheck, 
  XCircle, 
  Eye, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Filter,
  MessageSquare
} from 'lucide-react';
import { Trip } from '../../types/tourflow';

interface OperatorTripRequestsProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAcceptTripRequest: (tripId: string) => void;
  onDeclineTripRequest: (tripId: string) => void;
}

export const OperatorTripRequests: React.FC<OperatorTripRequestsProps> = ({
  trips,
  onSelectTrip,
  onAcceptTripRequest,
  onDeclineTripRequest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planning' | 'confirmed' | 'cancelled'>('all');

  const pendingRequests = trips.filter((t) => t.status === 'planning');
  const allRequests = trips.filter((t) => t.id !== 'trp-manali-alpine-demo-001');

  const filtered = allRequests.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Trip Requests & Inquiries</span>
            {pendingRequests.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {pendingRequests.length} PENDING ALLOTMENT
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Incoming booking inquiries directly from travelers requiring partner assignment, hotel lock-in, and confirmation.
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          Total Requests: <strong className="text-white">{trips.length}</strong>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by trip name, destination, route, or #ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'planning', label: `Pending (${pendingRequests.length})` },
            { id: 'confirmed', label: 'Accepted' },
            { id: 'cancelled', label: 'Declined' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-white font-bold text-sm">No trip requests matching criteria</div>
            <p className="text-xs mt-1">Try clearing your search query or status filter.</p>
          </div>
        ) : (
          filtered.map((req) => {
            const isPending = req.status === 'planning';
            return (
              <div
                key={req.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all ${
                  isPending
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/10 via-slate-900 to-slate-900 hover:border-amber-500/60'
                    : req.status === 'confirmed'
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-rose-900/40 opacity-70'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Main Info */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-400">#{req.id}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                            : req.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isPending ? 'Pending Operator Review' : req.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Submitted: {new Date(req.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{req.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Route: <strong className="text-slate-200">{req.origin || 'Mumbai'} → {req.destination?.name}</strong></span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Dates: <strong className="text-slate-200">{req.formatted_dates}</strong> ({req.duration_days} Days)</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Group: <strong className="text-slate-200">{req.traveler_count} Pax ({req.travel_type})</strong></span>
                      </span>
                    </div>

                    {req.preferences?.special_requests && (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300/90 flex items-start space-x-2">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                        <span><strong>Traveler Note:</strong> "{req.preferences.special_requests}"</span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions & Budget */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Requested Package Budget</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        ₹{(req.total_budget || req.total_cost || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      {isPending ? (
                        <>
                          <button
                            id={`btn-accept-request-${req.id}`}
                            onClick={() => onAcceptTripRequest(req.id)}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Accept & Assign</span>
                          </button>
                          <button
                            id={`btn-review-request-${req.id}`}
                            onClick={() => onSelectTrip(req.id)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                          >
                            Review
                          </button>
                          <button
                            id={`btn-decline-request-${req.id}`}
                            onClick={() => onDeclineTripRequest(req.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                            title="Decline request"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onSelectTrip(req.id)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5"
                        >
                          <span>Open Itinerary Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
