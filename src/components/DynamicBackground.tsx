import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Compass,
  Thermometer,
  Calendar,
  CloudSun
} from 'lucide-react';

export interface BackgroundScene {
  id: string;
  title: string;
  location: string;
  country: string;
  state_region?: string;
  description: string;
  imageUrl: string;
  accentColor: string;
  prominentColor: string;
  glowColor: string;
  secondaryGlow: string;
  temperature: string;
  weather: string;
  bestSeason: string;
  vibe: string;
  slug: string;
}

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: 'scene-tropical-sunset',
    title: 'Bora Bora & Tropical Overwater Retreat',
    location: 'Mount Otemanu & Turquoise Lagoon',
    country: 'French Polynesia',
    state_region: 'Leeward Islands',
    description: 'Golden-pink sunset over dramatic volcanic peaks, turquoise coral lagoons, and thatched overwater villas.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#818cf8',
    prominentColor: '#18122B',
    glowColor: '#EC4899',
    secondaryGlow: '#818CF8',
    temperature: '29°C',
    weather: 'Golden Sunset Breeze',
    bestSeason: 'May - Oct',
    vibe: 'Island Paradise',
    slug: 'goa',
  },
  {
    id: 'scene-maldives',
    title: 'Maldives Crystal Atoll & Overwater Boardwalk',
    location: 'Baa Atoll & Coral Reefs',
    country: 'Maldives',
    state_region: 'South Asia',
    description: 'Breathtaking twilight sky, glowing boardwalk lanterns, and serene crystal ocean waters.',
    imageUrl: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#6366f1',
    prominentColor: '#0A1526',
    glowColor: '#38BDF8',
    secondaryGlow: '#6366F1',
    temperature: '28°C',
    weather: 'Tropical Twilight',
    bestSeason: 'Nov - Apr',
    vibe: 'Luxury Escape',
    slug: 'goa',
  },
  {
    id: 'scene-swiss-alps',
    title: 'Swiss Alps & Matterhorn Vista',
    location: 'Zermatt & Interlaken Pass',
    country: 'Switzerland',
    state_region: 'Valais',
    description: 'Iconic alpine pyramid peaks, panoramic glacier railways, and alpine chalet villages.',
    imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#38bdf8',
    prominentColor: '#0D1527',
    glowColor: '#38BDF8',
    secondaryGlow: '#818CF8',
    temperature: '4°C',
    weather: 'Crisp Mountain Air',
    bestSeason: 'Dec - Apr & Jun - Sep',
    vibe: 'Glacial Luxury',
    slug: 'manali',
  },
  {
    id: 'scene-bali',
    title: 'Bali Rainforest & Sacred Waterfalls',
    location: 'Ubud & Nusa Penida',
    country: 'Indonesia',
    state_region: 'Bali',
    description: 'Lush terraced emerald rice paddies, cliffside ocean vistas, and tranquil yoga sanctuaries.',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#34d399',
    prominentColor: '#0A1E17',
    glowColor: '#10B981',
    secondaryGlow: '#F59E0B',
    temperature: '27°C',
    weather: 'Warm & Tropical',
    bestSeason: 'Apr - Oct',
    vibe: 'Tropical Sanctuary',
    slug: 'goa',
  },
  {
    id: 'scene-manali-alpine',
    title: 'Manali & Solang Snow Valley',
    location: 'Pir Panjal Valley, Himachal Pradesh',
    country: 'India',
    state_region: 'Himachal Pradesh',
    description: 'Crisp snow peaks, cedar forest canopies, and thrilling high-altitude alpine adventures.',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#a78bfa',
    prominentColor: '#1A1433',
    glowColor: '#A78BFA',
    secondaryGlow: '#60A5FA',
    temperature: '-2°C',
    weather: 'Powder Snow & Sun',
    bestSeason: 'Oct - Jun',
    vibe: 'Alpine Snow',
    slug: 'manali',
  },
  {
    id: 'scene-amalfi',
    title: 'Amalfi Coast Pastel Cliffs',
    location: 'Positano & Ravello',
    country: 'Italy',
    state_region: 'Campania',
    description: 'Vibrant cliff-hugging pastel villas cascading into cobalt blue Mediterranean waters.',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#38bdf8',
    prominentColor: '#0F1A2C',
    glowColor: '#FB923C',
    secondaryGlow: '#38BDF8',
    temperature: '23°C',
    weather: 'Mediterranean Sun',
    bestSeason: 'Apr - Oct',
    vibe: 'Coastal Glamour',
    slug: 'goa',
  },
  {
    id: 'scene-kyoto',
    title: 'Kyoto Zen Pagodas & Torii Shrines',
    location: 'Higashiyama & Arashiyama',
    country: 'Japan',
    state_region: 'Kansai',
    description: 'Ancient vermillion shrines, tranquil bamboo groves, and timeless tea houses.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#c084fc',
    prominentColor: '#20132C',
    glowColor: '#C084FC',
    secondaryGlow: '#F43F5E',
    temperature: '17°C',
    weather: 'Fresh & Crisp',
    bestSeason: 'Mar - May & Oct - Nov',
    vibe: 'Zen Serenity',
    slug: 'manali',
  },
  {
    id: 'scene-rajasthan',
    title: 'Udaipur Royal Lake Palace & Thar Sunset',
    location: 'Lake Pichola & Thar Sands',
    country: 'India',
    state_region: 'Rajasthan',
    description: 'Opulent marble palaces, golden sand dune sunsets, and royal heritage courtyards.',
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=2400&q=85',
    accentColor: '#818cf8',
    prominentColor: '#26142F',
    glowColor: '#F59E0B',
    secondaryGlow: '#EC4899',
    temperature: '25°C',
    weather: 'Golden Sunshine',
    bestSeason: 'Oct - Mar',
    vibe: 'Royal Heritage',
    slug: 'rajasthan',
  },
];

interface DynamicBackgroundProps {
  currentSceneIndex: number;
  onSceneChange: (index: number) => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  onQuickPlanDestination?: (slug: string) => void;
  isImmersiveMode?: boolean;
  onToggleImmersiveMode?: () => void;
  isLandingView?: boolean;
  children?: React.ReactNode;
}

export default function DynamicBackground({
  currentSceneIndex,
  onSceneChange,
  isAutoPlaying,
  onToggleAutoPlay,
  onQuickPlanDestination,
  isImmersiveMode = false,
  onToggleImmersiveMode,
  isLandingView = true,
  children,
}: DynamicBackgroundProps) {
  const [progress, setProgress] = useState(0);
  const [isControllerExpanded, setIsControllerExpanded] = useState(false);
  const ROTATION_INTERVAL_MS = 8000;
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scene = BACKGROUND_SCENES[currentSceneIndex] || BACKGROUND_SCENES[0];

  // Auto rotation timer with separate progress tracking
  useEffect(() => {
    if (!isAutoPlaying) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / ROTATION_INTERVAL_MS) * 100, 100);
      setProgress(pct);
    }, 100);

    const rotationTimeout = setTimeout(() => {
      setProgress(0);
      onSceneChange((currentSceneIndex + 1) % BACKGROUND_SCENES.length);
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(rotationTimeout);
    };
  }, [isAutoPlaying, currentSceneIndex, onSceneChange]);

  const handleNext = () => {
    setProgress(0);
    onSceneChange((currentSceneIndex + 1) % BACKGROUND_SCENES.length);
  };

  const handlePrev = () => {
    setProgress(0);
    onSceneChange((currentSceneIndex - 1 + BACKGROUND_SCENES.length) % BACKGROUND_SCENES.length);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between">
      
      {/* 1. Crossfading Background Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000"
        style={{
          backgroundColor: isLandingView ? '#0C0A17' : scene.prominentColor,
        }}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: isLandingView ? 1 : 0.28, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{
              backgroundImage: `url(${scene.imageUrl})`,
            }}
          />
        </AnimatePresence>

        {/* Clear Glass Cinematic Overlays & Prominent Tint */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ${
            isLandingView
              ? 'bg-gradient-to-b from-black/30 via-transparent to-black/60 backdrop-blur-[0.5px]'
              : 'backdrop-blur-xl'
          }`} 
          style={{
            backgroundColor: isLandingView ? 'transparent' : `${scene.prominentColor}E6`
          }}
        />

        {/* Dynamic Image Glow Orbs shifting with current scene */}
        <div
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full blur-[140px] opacity-35 transition-all duration-1000 pointer-events-none"
          style={{ backgroundColor: scene.glowColor }}
        />
        <div
          className="absolute top-1/2 -right-32 w-[600px] h-[600px] rounded-full blur-[160px] opacity-25 transition-all duration-1000 pointer-events-none"
          style={{ backgroundColor: scene.secondaryGlow }}
        />
        <div
          className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 transition-all duration-1000 pointer-events-none"
          style={{ backgroundColor: scene.accentColor }}
        />
      </div>

      {/* 2. Main Content Canvas */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>

      {/* 3. Floating Dynamic Backdrop Controller (Crystal Clear Glass Pill) */}
      <div className="fixed bottom-3 left-0 right-0 z-30 max-w-7xl mx-auto px-4 w-full flex items-center justify-between pointer-events-none select-none">
        
        {/* Left: Active Scene Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/25 text-white text-xs shadow-xl shadow-black/20 pointer-events-auto">
          <MapPin className="w-3 h-3 text-[#7065F0]" />
          <span className="font-semibold text-white/95 text-[11px] sm:text-xs">{scene.title.split('&')[0]}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80 text-[10px] hidden sm:inline">{scene.weather}</span>
          <span className="text-white/40 hidden sm:inline">•</span>
          <span className="text-white/95 font-bold text-[10px]">{scene.temperature}</span>
        </div>

        {/* Right: Controls & Auto-play progress bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/25 text-white shadow-xl shadow-black/20 pointer-events-auto">
          
          {/* Progress bar */}
          <div className="hidden md:flex items-center gap-1.5 w-16">
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#7065F0] transition-all duration-100 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="bg-prev-scene-btn"
              onClick={handlePrev}
              title="Previous Backdrop"
              className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              id="bg-toggle-play-btn"
              onClick={onToggleAutoPlay}
              title={isAutoPlaying ? 'Pause Backdrop Rotation' : 'Auto-Rotate Backdrops'}
              className="p-1 text-white hover:text-[#7065F0] transition-colors cursor-pointer"
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>

            <button
              id="bg-next-scene-btn"
              onClick={handleNext}
              title="Next Backdrop"
              className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
