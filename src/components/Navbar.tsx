import { Sparkles, MapPin, Layers, Compass, Plus, MessageSquare, Hotel, Shield } from 'lucide-react';
import BackendStatusBadge from './BackendStatusBadge';

interface NavbarProps {
  activeTab: 'landing' | 'workspace' | 'destinations' | 'catalog' | 'ai_console';
  setActiveTab: (tab: 'landing' | 'workspace' | 'destinations' | 'catalog' | 'ai_console') => void;
  onOpenCreateTrip: () => void;
  onSwitchToOperator?: () => void;
}

export default function Navbar({ activeTab, setActiveTab, onOpenCreateTrip, onSwitchToOperator }: NavbarProps) {
  return (
    <header id="main-navigation-header" className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo - WonderAi with 4-Point Star */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button
            id="brand-home-btn"
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="text-stone-900 group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7 fill-[#7065F0]" viewBox="0 0 24 24">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-2xl font-black tracking-tight text-stone-900">
                  WonderAi<span className="text-[#7065F0]">.</span>
                </span>
              </div>
              <p className="text-[10px] text-stone-500 tracking-wider font-semibold -mt-0.5">AI Travel Intelligence</p>
            </div>
          </button>

          {/* Primary Navigation Pills */}
          <nav id="primary-nav-tabs" className="hidden md:flex items-center gap-1.5 p-1 bg-stone-200/50 rounded-full border border-stone-200/60">
            <button
              id="nav-landing-tab"
              onClick={() => setActiveTab('landing')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'landing'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Overview
            </button>

            <button
              id="nav-ai-tab"
              onClick={() => setActiveTab('ai_console')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ai_console'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat</span>
            </button>

            <button
              id="nav-workspace-tab"
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'workspace'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>My Trips & Canvas</span>
            </button>

            <button
              id="nav-destinations-tab"
              onClick={() => setActiveTab('destinations')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'destinations'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>

            <button
              id="nav-catalog-tab"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Hotel className="w-3.5 h-3.5" />
              <span>Stays & Activities</span>
            </button>
          </nav>
        </div>

        {/* Right Actions: Currency Pill, Status, Operator Portal Switcher, Gradient CTA */}
        <div className="flex items-center gap-2.5">
          {onSwitchToOperator && (
            <button
              id="btn-nav-switch-to-operator"
              onClick={onSwitchToOperator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs border border-slate-700 shadow-sm transition-all cursor-pointer"
              title="Open TourFlow Operator Command Center"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Operator Portal</span>
              <span className="sm:hidden">Operator</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 text-xs font-bold shadow-2xs">
            <span>🇮🇳</span>
            <span>INR (₹)</span>
          </div>

          <BackendStatusBadge />

          <button
            id="open-create-trip-nav-btn"
            onClick={onOpenCreateTrip}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-98 text-white font-bold text-xs tracking-wide shadow-sm shadow-rose-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Plan Trip</span>
            <span className="sm:hidden">Plan</span>
          </button>
        </div>

      </div>
    </header>
  );
}

