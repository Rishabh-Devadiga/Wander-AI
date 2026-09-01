import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface OperatorAlertsProps {
  alerts: any[];
  onResolveAlert: (alertId: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export const OperatorAlerts: React.FC<OperatorAlertsProps> = ({
  alerts,
  onResolveAlert,
  onSelectTrip,
}) => {
  const unresolved = alerts.filter((a) => !a.is_resolved);
  const resolved = alerts.filter((a) => a.is_resolved);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Safety & Incident Desk</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time weather sensor alerts, road closure advisories, and airline delay tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold">
            {unresolved.length} Active Incidents
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
            {resolved.length} Resolved
          </span>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Urgent Incidents ({unresolved.length})
        </h2>

        {unresolved.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="font-bold text-white text-sm">All Sectors Operational</div>
            <p className="text-xs mt-1">No active safety warnings or grounded activities.</p>
          </div>
        ) : (
          unresolved.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0 mt-0.5 animate-pulse">
                  <ShieldAlert className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {alert.severity} • {alert.alert_type}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Tour #{alert.trip_id}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{alert.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  id={`btn-open-workspace-from-alert-${alert.trip_id}`}
                  onClick={() => onSelectTrip(alert.trip_id)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition-colors"
                >
                  <span>Resolve & Replan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onResolveAlert(alert.id)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Mark Dismissed
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolved History */}
      {resolved.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Resolved Incidents ({resolved.length})
          </h2>

          <div className="space-y-2">
            {resolved.map((alert) => (
              <div
                key={alert.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between text-xs text-slate-400"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">{alert.title}</span>
                  <span className="text-slate-500 font-mono">#{alert.trip_id}</span>
                </div>
                <span className="text-emerald-400 font-medium text-[11px]">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
