import React, { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Car, 
  Zap, 
  Menu, 
  X, 
  Layers, 
  MessageSquare, 
  MapPin, 
  Hotel, 
  Compass, 
  Globe, 
  Heart,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Destination } from '../types/tourflow';

interface HeroLandingProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onOpenCreateTrip: () => void;
  onExploreWorkspace: () => void;
  onStartChatWithPrompt?: (prompt: string) => void;
  onNavigateTab?: (tab: 'landing' | 'workspace' | 'destinations' | 'catalog' | 'ai_console') => void;
  onOpenMenuDrawer?: () => void;
  onSwitchToOperator?: () => void;
}

export default function HeroLanding({
  destinations,
  onSelectDestination,
  onOpenCreateTrip,
  onExploreWorkspace,
  onStartChatWithPrompt,
  onNavigateTab,
  onSwitchToOperator,
}: HeroLandingProps) {
  const [heroPrompt, setHeroPrompt] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePromptSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = heroPrompt.trim();
    if (!trimmed) {
      if (onStartChatWithPrompt) {
        onStartChatWithPrompt('Plan a 7-day tropical luxury getaway');
      } else {
        onOpenCreateTrip();
      }
      return;
    }
    if (onStartChatWithPrompt) {
      onStartChatWithPrompt(trimmed);
    } else {
      onOpenCreateTrip();
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setHeroPrompt(suggestionText);
    if (onStartChatWithPrompt) {
      onStartChatWithPrompt(suggestionText);
    }
  };

  const quickPrompts = [
    { 
      label: 'e.g. 7 days in Bali under ₹80k', 
      icon: (
        <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M13 3c0 2.8 1.5 5.2 3.8 6.5-1.5 1-3.2 1.5-5 1.5-1.4 0-2.8-.3-4-1C10 8.7 11.5 6.3 11.5 3.5 11.5 3.3 11.5 3.2 11.5 3H13m-2 9.5c.3 3.3-.6 6.7-2.5 9.5H6.5c1.8-2.6 2.6-5.8 2.3-8.8 1-.5 1.9-1.1 2.7-1.7.3.3.6.7.9 1M17 10c2.5-1 4.5-2.9 5.5-5.5-.3.8-.8 1.5-1.5 2.1-.9.7-2 1.2-3.1 1.4-1.3.2-2.6 0-3.8-.5 1.1.9 2 2.1 2.9 2.5z"/>
        </svg>
      ),
      value: 'Plan 7 days in Bali with beach villas and culture under ₹80,000' 
    },
    { 
      label: 'Family trip to Europe', 
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      value: 'Plan a 10-day family trip to Europe with scenic train rides and comfortable stays' 
    },
    { 
      label: 'Luxury getaway', 
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path d="M6 3h12l4 6-10 12L2 9z"></path>
          <path d="M11 3L8 9l4 12 4-12-3-6"></path>
          <path d="M2 9h20"></path>
        </svg>
      ),
      value: 'Create a 5-day ultra-luxury private villa getaway with spa and fine dining' 
    },
    { 
      label: 'Adventure in the Alps', 
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
        </svg>
      ),
      value: 'Plan a 6-day thrilling adventure in the Swiss Alps with ski passes and mountain lodges' 
    },
  ];

  return (
    <div id="wanderai-hero-screen" className="relative min-h-[92vh] flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      
      {/* Top Header Navigation matching Screenshot */}
      <header className="relative z-30 flex items-center justify-between max-w-7xl mx-auto w-full pt-2">
        {/* Brand Logo with 4-Point Star Icon & Layla typography */}
        <div 
          onClick={() => { if (onNavigateTab) onNavigateTab('landing'); }}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          {/* Custom 4-Point Star Sparkle */}
          <div className="text-white drop-shadow-md">
            <svg 
              className="w-7 h-7 sm:w-8 h-8 fill-white" 
              viewBox="0 0 24 24"
            >
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>
          <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            WonderAi<span className="text-[#7065F0]">.</span>
          </span>
        </div>

        {/* Right Actions: Operator Switcher + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onSwitchToOperator && (
            <button
              id="hero-switch-to-operator-btn"
              onClick={onSwitchToOperator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white font-bold text-xs border border-emerald-500/40 shadow-lg backdrop-blur-md transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Operator Portal</span>
              <span className="sm:hidden">Operator</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          <button
            id="wanderai-hamburger-toggle-btn"
            onClick={() => setIsMenuOpen(true)}
            className="p-2.5 rounded-full text-white hover:bg-white/15 transition-all cursor-pointer drop-shadow-md active:scale-95"
            title="Open Menu"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-7 h-7 sm:w-8 h-8 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* Center Main Stage matching Screenshot */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full py-8 sm:py-12">
        
        {/* Headline: "Where do you want to go?" */}
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white drop-shadow-lg mb-8 sm:mb-10 max-w-3xl"
        >
          Where do you want to go?
        </motion.h1>

        {/* Central Search Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-3xl bg-white rounded-3xl sm:rounded-[36px] shadow-2xl shadow-black/30 p-4 sm:p-6 space-y-4 text-left border border-white/80"
        >
          {/* Top Input Row with Sparkle and Purple Action Arrow */}
          <form onSubmit={handlePromptSubmit} className="flex items-center gap-3">
            
            {/* Sparkle 4-point Icon */}
            <div className="pl-1 sm:pl-2 text-[#7C3AED] shrink-0">
              <svg 
                className="w-6 h-6 sm:w-7 h-7 fill-[#7C3AED]" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" />
              </svg>
            </div>

            {/* Input Field */}
            <input
              id="wanderai-main-search-input"
              type="text"
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              placeholder="Tell me your style, budget and dream trip..."
              className="flex-1 text-base sm:text-lg font-medium text-stone-800 placeholder:text-stone-400 placeholder:font-normal bg-transparent focus:outline-none py-2"
            />

            {/* Purple Circular Submit Button with Arrow */}
            <button
              id="wanderai-submit-prompt-btn"
              type="submit"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#7065F0] hover:bg-[#5e51ee] active:scale-95 text-white flex items-center justify-center shadow-md shadow-[#7065F0]/40 transition-all cursor-pointer shrink-0"
              title="Generate Travel Plan"
            >
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
            </button>
          </form>

          {/* Bottom Suggestion Pills matching Screenshot - Single-line aligned */}
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-2 pt-2 border-t border-stone-100">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(item.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/90 text-stone-700 hover:text-stone-900 text-xs font-medium transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              >
                <span className="text-stone-500">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Bottom 4 Glassmorphic Action Cards with minimal blur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl w-full pt-8 sm:pt-10"
        >
          {/* Card 1: Create a new trip */}
          <button
            id="wanderai-card-create-trip"
            onClick={onOpenCreateTrip}
            className="group text-left p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 hover:border-white/50 text-white flex items-center gap-3.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-98"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/70 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:border-white transition-transform">
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-semibold text-white">Create</div>
              <div className="text-xs sm:text-sm font-medium text-stone-200 opacity-95">a new trip</div>
            </div>
          </button>

          {/* Card 2: Inspire me where to go */}
          <button
            id="wanderai-card-inspire"
            onClick={() => {
              if (onStartChatWithPrompt) {
                onStartChatWithPrompt("Inspire me with 3 unique, unforgettable travel destinations for this season");
              } else if (onNavigateTab) {
                onNavigateTab('destinations');
              }
            }}
            className="group text-left p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 hover:border-white/50 text-white flex items-center gap-3.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-98"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-semibold text-white">Inspire me</div>
              <div className="text-xs sm:text-sm font-medium text-stone-200 opacity-95">where to go</div>
            </div>
          </button>

          {/* Card 3: Build a road trip */}
          <button
            id="wanderai-card-roadtrip"
            onClick={() => {
              if (onStartChatWithPrompt) {
                onStartChatWithPrompt("Plan a scenic 5-day road trip with vehicle routes, mountain viewpoints, and stopovers");
              } else {
                onOpenCreateTrip();
              }
            }}
            className="group text-left p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 hover:border-white/50 text-white flex items-center gap-3.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-98"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Car className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-semibold text-white">Build a</div>
              <div className="text-xs sm:text-sm font-medium text-stone-200 opacity-95">road trip</div>
            </div>
          </button>

          {/* Card 4: Plan a last-minute getaway */}
          <button
            id="wanderai-card-lastminute"
            onClick={() => {
              if (onStartChatWithPrompt) {
                onStartChatWithPrompt("Plan a spontaneous 3-day weekend getaway for this coming Friday with boutique stays");
              } else {
                onOpenCreateTrip();
              }
            }}
            className="group text-left p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 hover:border-white/50 text-white flex items-center gap-3.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-98"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-semibold text-white">Plan a</div>
              <div className="text-xs sm:text-sm font-medium text-stone-200 opacity-95">last-minute getaway</div>
            </div>
          </button>
        </motion.div>

      </div>

      {/* Empty bottom spacer for balance */}
      <div className="relative z-10 hidden sm:block h-6" />

      {/* Slide-out Menu Drawer when user clicks Hamburger */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm h-full bg-stone-900/95 backdrop-blur-2xl border-l border-white/10 text-white p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                  </svg>
                  <span className="font-display font-black text-2xl tracking-tight text-white">WonderAi<span className="text-[#7065F0]">.</span></span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigateTab) onNavigateTab('landing');
                  }}
                  className="w-full p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-left font-bold text-sm flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5 text-[#7065F0]" />
                    <span>Home & Discover</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigateTab) onNavigateTab('ai_console');
                  }}
                  className="w-full p-3 rounded-2xl hover:bg-white/10 text-left font-semibold text-sm flex items-center justify-between text-stone-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-rose-400" />
                    <span>WonderAi Travel Concierge & Checklist</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigateTab) onNavigateTab('workspace');
                  }}
                  className="w-full p-3 rounded-2xl hover:bg-white/10 text-left font-semibold text-sm flex items-center justify-between text-stone-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-amber-400" />
                    <span>My Trips & Canvas</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigateTab) onNavigateTab('destinations');
                  }}
                  className="w-full p-3 rounded-2xl hover:bg-white/10 text-left font-semibold text-sm flex items-center justify-between text-stone-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span>Explore Destinations</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigateTab) onNavigateTab('catalog');
                  }}
                  className="w-full p-3 rounded-2xl hover:bg-white/10 text-left font-semibold text-sm flex items-center justify-between text-stone-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Hotel className="w-5 h-5 text-cyan-400" />
                    <span>Stays & Curated Catalogue</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              </nav>

              {/* Action Button inside Drawer */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCreateTrip();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7065F0] via-purple-600 to-pink-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-[#7065F0]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Itinerary</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-6 border-t border-white/10 text-xs text-stone-400 space-y-2">
              <div className="flex items-center justify-between">
                <span>Currency</span>
                <span className="font-bold text-white">INR (₹)</span>
              </div>
              <p className="text-[11px] text-stone-400">
                WonderAi &bull; AI Travel Intelligence Platform &bull; 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
