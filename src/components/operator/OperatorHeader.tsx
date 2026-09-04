import React from 'react';
import { 
  Compass, 
  Activity, 
  Radio, 
  ArrowLeftRight, 
  Zap, 
  Bell, 
  ShieldCheck, 
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';

interface OperatorHeaderProps {
  operatorUser: { email: string; name: string; role: string; operator_name: string };
  isSyncing: boolean;
  lastSyncTime: Date;
  onManualSync: () => void;
  onTriggerDisruptionDemo: () => void;
  onSwitchToTraveler: () => void;
  onLogout: () => void;
  unresolvedAlertCount: number;
}

export const OperatorHeader: React.FC<OperatorHeaderProps> = ({
  operatorUser,
  isSyncing,
  lastSyncTime,
  onManualSync,
  onTriggerDisruptionDemo,
  onSwitchToTraveler,
  onLogout,
  unresolvedAlertCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Agency Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/30">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white tracking-tight">TourFlow AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OPERATOR HUB
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="font-medium text-slate-300">{operatorUser.operator_name}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-400">Kullu & North India Hub</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Live Sync */}
          <div className="flex items-center space-x-3">
            {/* Live Database Sync Indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium font-mono text-[11px]">POSTGRES SYNCED</span>
              </div>
              <button
                id="btn-manual-sync-operator"
                onClick={onManualSync}
                title="Force refresh with shared database"
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Disruption Simulator Button */}
            <button
              id="btn-simulate-disruption-header"
              onClick={onTriggerDisruptionDemo}
              title="Simulate severe weather wind shear at Solang Valley (Day 3 Paragliding)"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm group"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Simulate Weather Disruption</span>
              <span className="sm:hidden">Simulate</span>
            </button>

            {/* Alerts Count */}
            {unresolvedAlertCount > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{unresolvedAlertCount} Alert{unresolvedAlertCount > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Switch to Traveler View */}
            <button
              id="btn-switch-to-traveler-view-header"
              onClick={onSwitchToTraveler}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Traveler View</span>
            </button>

            {/* Operator Profile */}
            <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white border border-emerald-500/40">
                RS
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-200">{operatorUser.name}</div>
                <div className="text-[10px] text-emerald-400">{operatorUser.role}</div>
              </div>
            </div>

            {/* Logout */}
            <button
              id="btn-operator-logout"
              onClick={onLogout}
              title="Sign out of Operator Portal"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
