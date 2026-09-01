import React from 'react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Zap,
  Phone,
  Eye,
  ChevronRight,
  UserCheck,
  XCircle
} from 'lucide-react';
import { Trip } from '../../types/tourflow';

interface OperatorDashboardProps {
  kpis: {
    active_tours: number;
    travelers_on_ground: number;
    today_activities: number;
    urgent_issues: number;
    upcoming_trips: number;
    total_revenue: number;
  };
  priorityAlerts: any[];
  activeTours: any[];
  allTrips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onTriggerDisruptionDemo: () => void;
  onAcceptTripRequest: (tripId: string) => void;
  onDeclineTripRequest: (tripId: string) => void;
  onOpenReplanForTrip: (tripId: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  kpis,
  priorityAlerts,
  activeTours,
  allTrips,
  onSelectTrip,
  onTriggerDisruptionDemo,
  onAcceptTripRequest,
  onDeclineTripRequest,
  onOpenReplanForTrip,
}) => {
  const pendingRequests = allTrips.filter((t) => t.status === 'planning');

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Operations Command Center</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              LIVE DISPATCH
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time monitoring of all active tours, vendor allotments, weather sensors, and traveler safety.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-simulate-disruption-dashboard"
            onClick={onTriggerDisruptionDemo}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Simulate Paragliding Weather Disruption</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Tours On Ground</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{kpis.active_tours}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span className="text-emerald-400 font-medium">100% verified</span>
            <span>across 4 sectors</span>
          </div>
        </div>

        {/* Travelers on Ground */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Travelers Hosted</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{kpis.travelers_on_ground} Pax</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span className="text-slate-300">All escorted by verified partners</span>
          </div>
        </div>

        {/* Urgent Issues */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Urgent Safety / Weather</span>
            <div className={`p-2 rounded-xl ${kpis.urgent_issues > 0 ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold mt-2 ${kpis.urgent_issues > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {kpis.urgent_issues}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.urgent_issues > 0 ? 'Requires immediate operator replan' : 'All sectors clear'}
          </div>
        </div>

        {/* Revenue Managed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Tour Volume</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">₹{(kpis.total_revenue).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <span>Direct partner payments secured</span>
          </div>
        </div>
      </div>

      {/* Priority Incident Banner (If Alert Active) */}
      {priorityAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0 mt-0.5 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    CRITICAL OPERATIONAL INCIDENT
                  </span>
                  <span className="text-xs text-slate-400">Tour #{priorityAlerts[0].trip_id}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {priorityAlerts[0].title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {priorityAlerts[0].description}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400 font-mono">
                  <span>Tour: <strong className="text-white">{priorityAlerts[0].trip_title}</strong></span>
                  <span>Pax: <strong className="text-white">{priorityAlerts[0].traveler_count}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
              <button
                id="btn-open-replan-alert-banner"
                onClick={() => onOpenReplanForTrip(priorityAlerts[0].trip_id)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/30 flex items-center justify-center space-x-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Launch AI Replan & Impact Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Tour Requests (Needs Acceptance) */}
      {pendingRequests.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Incoming Traveler Booking Requests ({pendingRequests.length})
              </h2>
            </div>
            <span className="text-xs text-amber-300 font-medium">Pending Operator Allotment</span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">#{req.id}</span>
                    <span className="text-sm font-bold text-white">{req.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {req.formatted_dates}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <span>Route: <strong className="text-slate-200">{req.origin} → {req.destination?.name}</strong></span>
                    <span>•</span>
                    <span>Travelers: <strong className="text-slate-200">{req.traveler_count} ({req.travel_type})</strong></span>
                    <span>•</span>
                    <span>Budget: <strong className="text-emerald-400">₹{(req.total_budget || req.total_cost || 0).toLocaleString()}</strong></span>
                  </div>
                  {req.preferences?.special_requests && (
                    <div className="text-xs text-amber-300/90 italic mt-1">
                      Note: "{req.preferences.special_requests}"
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id={`btn-accept-request-${req.id}`}
                    onClick={() => onAcceptTripRequest(req.id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Accept & Assign</span>
                  </button>
                  <button
                    id={`btn-review-request-${req.id}`}
                    onClick={() => onSelectTrip(req.id)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                  >
                    Review
                  </button>
                  <button
                    id={`btn-decline-request-${req.id}`}
                    onClick={() => onDeclineTripRequest(req.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Decline request"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tours Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Active Tours Management</h2>
            <p className="text-xs text-slate-400">Canonical trip records synchronized with PostgreSQL</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Total: {activeTours.length} tours</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Tour ID & Name</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Travelers</th>
                <th className="px-5 py-3">Timeline</th>
                <th className="px-5 py-3">Package Value</th>
                <th className="px-5 py-3">Operational Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {activeTours.map((tour) => {
                const isIssue = tour.status === 'issue' || tour.has_unresolved_alerts;
                const isAttention = tour.status === 'attention';

                return (
                  <tr
                    key={tour.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isIssue ? 'bg-rose-950/20' : isAttention ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{tour.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">#{tour.id} • {tour.operator_name}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200">{tour.route}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200">{tour.travelers} Pax</div>
                      <div className="text-[11px] text-slate-400 capitalize">{tour.travel_type}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-emerald-400 font-mono">Day {tour.current_day}</span>
                        <span className="text-slate-500">/ {tour.duration_days}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-white font-mono">₹{tour.price.toLocaleString()}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isIssue
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                            : isAttention
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isIssue ? '🔴 Urgent Issue' : isAttention ? '🟡 Attention Needed' : '🟢 On Track'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        id={`btn-open-workspace-${tour.id}`}
                        onClick={() => onSelectTrip(tour.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1 ${
                          isIssue
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
