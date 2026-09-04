import React from 'react';
import { 
  LayoutDashboard, 
  Inbox,
  Map, 
  CalendarRange,
  Ticket, 
  Building2, 
  Car,
  Compass,
  AlertTriangle, 
  Bot,
  TrendingUp, 
  Sparkles,
  Layers,
  PhoneCall
} from 'lucide-react';

export type OperatorNavTab = 
  | 'dashboard' 
  | 'trip_requests'
  | 'active_tours' 
  | 'itineraries'
  | 'bookings' 
  | 'hotels'
  | 'transport'
  | 'vendors' 
  | 'alerts' 
  | 'ai_assistant'
  | 'analytics';

interface OperatorSidebarProps {
  currentTab: OperatorNavTab;
  onSelectTab: (tab: OperatorNavTab) => void;
  unresolvedAlertCount: number;
  activeToursCount: number;
  pendingRequestsCount: number;
}

export const OperatorSidebar: React.FC<OperatorSidebarProps> = ({
  currentTab,
  onSelectTab,
  unresolvedAlertCount,
  activeToursCount,
  pendingRequestsCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as OperatorNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'trip_requests' as OperatorNavTab,
      label: 'Trip Requests',
      icon: Inbox,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} new` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold',
    },
    {
      id: 'active_tours' as OperatorNavTab,
      label: 'Active Tours',
      icon: Map,
      badge: activeToursCount > 0 ? `${activeToursCount}` : undefined,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'itineraries' as OperatorNavTab,
      label: 'Itineraries',
      icon: CalendarRange,
    },
    {
      id: 'bookings' as OperatorNavTab,
      label: 'Bookings',
      icon: Ticket,
    },
    {
      id: 'hotels' as OperatorNavTab,
      label: 'Hotels & Resorts',
      icon: Building2,
    },
    {
      id: 'transport' as OperatorNavTab,
      label: 'Transport',
      icon: Car,
    },
    {
      id: 'vendors' as OperatorNavTab,
      label: 'Activities & Vendors',
      icon: Compass,
    },
    {
      id: 'alerts' as OperatorNavTab,
      label: 'Alerts',
      icon: AlertTriangle,
      badge: unresolvedAlertCount > 0 ? `${unresolvedAlertCount}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    },
    {
      id: 'ai_assistant' as OperatorNavTab,
      label: 'AI Operations Assistant',
      icon: Bot,
      badge: 'PRO',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'analytics' as OperatorNavTab,
      label: 'Analytics',
      icon: TrendingUp,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Operations Hub Info Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active Agency
          </div>
          <div className="font-bold text-white text-sm flex items-center justify-between">
            <span>Himalayan Trails Ltd.</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Direct dispatch authority for Himachal, Ladakh & Kashmir sectors.
          </p>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Operations Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Support Widget */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini Ops Engine</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Automated impact analysis & high-confidence alternative scoring active.
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>TourFlow Core v2.4</span>
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>PostgreSQL Active</span>
          </span>
        </div>
      </div>
    </aside>
  );
};
