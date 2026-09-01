import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ArrowRight, 
  Bed, 
  Mountain, 
  Car, 
  Star, 
  Calendar, 
  RefreshCw, 
  Sparkles, 
  Heart,
  Play,
  Volume2,
  VolumeX,
  Share2,
  Compass,
  Utensils,
  CheckCircle2,
  Sliders,
  DollarSign,
  Shield,
  Layers
} from 'lucide-react';
import { Destination, Hotel, Activity, TransportOption } from '../types/tourflow';
import { TourFlowApi } from '../services/api';

interface DestinationExplorerProps {
  initialDestinationSlug?: string;
  onPlanTripForDestination: (destination: Destination) => void;
  onStartChatWithPrompt?: (prompt: string) => void;
}

export default function DestinationExplorer({
  initialDestinationSlug,
  onPlanTripForDestination,
  onStartChatWithPrompt,
}: DestinationExplorerProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transport, setTransport] = useState<TransportOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Active sub-tab inside selected destination
  const [activeGuideTab, setActiveGuideTab] = useState<'overview' | 'stays' | 'experiences' | 'cuisine' | 'mobility'>('overview');

  // Video Shorts State (WonderAi signature Reel feed)
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [savedReels, setSavedReels] = useState<string[]>([]);

  // Travel Shorts dynamically derived from API destinations or empty array
  const travelShorts = destinations.map((d, idx) => ({
    id: `reel-${d.slug || d.id}`,
    destination: `${d.name}, ${d.state_region}`,
    title: `Explore ${d.name}: ${d.best_time_to_visit || 'Top Travel Spot'}`,
    creator: `@wanderer_${d.slug || 'explorer'}`,
    duration: `${Math.max(3, (idx % 4) + 3)} Days`,
    budget: `₹${((idx + 1) * 6500 + 15000).toLocaleString()}`,
    vibe: d.popular_activities?.[0] || 'Scenic / Adventure',
    likes: `${(45 + (idx * 23.4) % 180).toFixed(1)}k`,
    tags: [`#${d.name.replace(/\s+/g, '')}`, `#${d.state_region.replace(/\s+/g, '')}`, '#WanderFlow'],
    imageUrl: d.hero_image_url || 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
    prompt: `Plan a ${(idx % 4) + 3}-day luxury trip to ${d.name}, ${d.state_region} with top scenic viewpoints and verified stays`,
    highlight: d.description || `Experience the best scenic attractions and cultural sights of ${d.name}.`
  }));

  // Local cuisine highlights per destination
  const destinationCuisines: Record<string, Array<{ name: string; tag: string; desc: string; icon: string }>> = {
    manali: [
      { name: 'Siddu with Ghee & Dal', tag: 'Traditional Himachali', desc: 'Steamed wheat pocket filled with spiced poppy seeds or walnuts, served piping hot with pure desi ghee.', icon: '🥟' },
      { name: 'Trout Fish Fry', tag: 'Tirthan / Beas Special', desc: 'Glacier-fed river trout marinated in local mountain herbs and pan-fried to crisp perfection.', icon: '🐟' },
      { name: 'Kullu Dham', tag: 'Festive Feast', desc: 'Seven-course traditional Himachali thali cooked in copper pots without onions or garlic by hereditary bhotis.', icon: '🍛' },
      { name: 'Wood-fired Apple Crumble', tag: 'Old Manali Cafés', desc: 'Locally picked organic green apples baked with cinnamon and served with vanilla ice cream.', icon: '🥧' }
    ],
    goa: [
      { name: 'Goan Fish Curry & Rice', tag: 'Coastal Classic', desc: 'Kingfish simmered in freshly ground coconut paste, Kashmiri chilies, and tangy dried kokum petals.', icon: '🍛' },
      { name: 'Pork / Mushroom Vindaloo', tag: 'Portuguese-Goan', desc: 'Slow-cooked in vinegar, garlic, ginger, and aromatic spices with rustic poi bread.', icon: '🍲' },
      { name: 'Bebinca', tag: 'Iconic Dessert', desc: '7-layer traditional Goan pudding made with coconut milk, egg yolks, nutmeg, and caramelized ghee.', icon: '🍰' },
      { name: 'Prawn Balchão', tag: 'Fiery Pickled Prawns', desc: 'Tiger prawns cooked in a spicy, sour tomato-chili paste infused with Goan feni.', icon: '🦐' }
    ],
    kerala: [
      { name: 'Karimeen Pollichathu', tag: 'Backwater Pearl Spot', desc: 'Marinated pearl spot fish wrapped in fragrant charred banana leaf and slow-cooked in shallot masala.', icon: '🐟' },
      { name: 'Appam with Stew', tag: 'Breakfast Classic', desc: 'Lacy, crispy-edged fermented rice hoppers served with velvety coconut milk vegetable or chicken stew.', icon: '🥞' },
      { name: 'Malabar Parotta & Beef Roast', tag: 'Malabar Special', desc: 'Flaky, layered handmade parotta paired with slow-roasted coconut chunk pepper gravy.', icon: '🥘' },
      { name: 'Ada Pradhaman', tag: 'Royal Payasam', desc: 'Steamed rice ribbon dessert simmered in jaggery syrup, thick coconut milk, and roasted cashews.', icon: '🥣' }
    ],
    rajasthan: [
      { name: 'Dal Baati Churma', tag: 'Royal Signature', desc: 'Crispy whole-wheat dumplings baked over cow dung cakes, dipped in ghee, accompanied by five-lentil curry and sweet jaggery crumble.', icon: '🫓' },
      { name: 'Laal Maas', tag: 'Rajput Royalty', desc: 'Fiery smoked mutton curry cooked with fiery Mathania red chilies and whole cloves.', icon: '🍖' },
      { name: 'Gatte ki Sabzi', tag: 'Desert Heritage', desc: 'Spiced gram flour dumplings simmered in a luscious, tangy yogurt and mustard seed gravy.', icon: '🍲' },
      { name: 'Ghewar with Rabdi', tag: 'Festival Delicacy', desc: 'Honeycomb disc sweet soaked in saffron sugar syrup and generously topped with clotted cream rabdi and pistachios.', icon: '🍯' }
    ],
    kashmir: [
      { name: 'Kashmiri Wazwan Rogan Josh', tag: 'Imperial Wazwan', desc: 'Tender mutton cooked in Kashmiri maval flower extract, aromatic fennel, and dry ginger.', icon: '🍲' },
      { name: 'Gushtaba & Rista', tag: 'Hand-pounded Meatballs', desc: 'Silken mutton meatballs poached in velvety saffron yogurt gravy (Gushtaba) and red pepper gravy (Rista).', icon: '🥘' },
      { name: 'Kahwa & Nadru Monje', tag: 'Traditional Tea & Snacks', desc: 'Green tea infused with saffron strands, whole cardamom, crushed almonds, served with crispy lotus stem fritters.', icon: '☕' },
      { name: 'Modur Pulao', tag: 'Sweet Saffron Rice', desc: 'Fragrant basmati rice tossed with pure Kashmiri saffron, dried fruits, pomegranate seeds, and honey.', icon: '🍚' }
    ]
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const data = await TourFlowApi.getDestinations();
      setDestinations(data);
      if (data.length > 0) {
        const target = initialDestinationSlug
          ? data.find(d => d.slug === initialDestinationSlug) || data[0]
          : data[0];
        setSelectedDest(target);
        loadCatalogForDestination(target.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogForDestination = async (destId: string) => {
    setCatalogLoading(true);
    try {
      const [h, a, t] = await Promise.all([
        TourFlowApi.getHotels(destId),
        TourFlowApi.getActivities(destId),
        TourFlowApi.getTransport(destId),
      ]);
      setHotels(h);
      setActivities(a);
      setTransport(t);
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSelectDestination = (dest: Destination) => {
    setSelectedDest(dest);
    loadCatalogForDestination(dest.id);
  };

  const toggleSaveReel = (reelId: string) => {
    setSavedReels(prev => 
      prev.includes(reelId) ? prev.filter(id => id !== reelId) : [...prev, reelId]
    );
  };

  const currentCuisines = selectedDest ? (destinationCuisines[selectedDest.slug] || destinationCuisines['manali']) : [];

  return (
    <div id="destination-explorer-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 pb-28">
      
      {/* -------------------------------------------------------------
          HEADER BAR (Layla.ai Style Clean Title with AI Prompt Pill)
         ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[10px] uppercase tracking-wider">
              Atlas & Inspiration
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-600 font-semibold">WonderAi Video Shorts & State Guides</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Discover India
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1">
            Browse immersive travel shorts, verified boutique stays, and curated itineraries across 28+ states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onStartChatWithPrompt?.('Inspire me with 3 unique destinations in India for an unforgettable vacation')}
            className="px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#7065F0]" />
            <span>Ask Layla for Ideas</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          SECTION 1: LAYLA-STYLE TRAVEL REELS (Video Shorts Carousel)
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">Trending Travel Reels</h2>
              <p className="text-xs text-stone-500">Swipe real traveler shorts & plan the exact vibe in 1-click</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
            <span>Scroll &bull;</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Horizontal Reels Stream */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar pt-1">
          {travelShorts.map((reel, idx) => {
            const isSaved = savedReels.includes(reel.id);
            const isSelected = activeReelIndex === idx;

            return (
              <div
                key={reel.id}
                onClick={() => setActiveReelIndex(idx)}
                className={`relative shrink-0 w-72 sm:w-80 h-[460px] rounded-3xl overflow-hidden cursor-pointer group shadow-md transition-all duration-300 border-2 ${
                  isSelected ? 'border-rose-500 ring-4 ring-rose-500/20 scale-[1.01]' : 'border-transparent hover:border-stone-300'
                }`}
              >
                {/* Reel Background Image / Simulated Video Loop */}
                <img
                  src={reel.imageUrl}
                  alt={reel.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-black/30" />

                {/* Top Badge: Location & Audio Indicator */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{reel.destination}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveReel(reel.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:text-rose-400 transition-colors border border-white/20 cursor-pointer"
                      title="Save to bucket list"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                    
                    <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                      <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Bottom Content Container */}
                <div className="absolute bottom-4 inset-x-4 z-10 space-y-3">
                  {/* Creator Tag & Likes */}
                  <div className="flex items-center justify-between text-xs text-stone-300 font-medium">
                    <span className="text-white font-bold">{reel.creator}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] text-white font-extrabold">
                      ❤️ {reel.likes}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                    {reel.title}
                  </h3>

                  {/* Highlight Quote */}
                  <p className="text-[11px] text-stone-300 line-clamp-2 italic leading-relaxed">
                    "{reel.highlight}"
                  </p>

                  {/* Pricing & Duration Strip */}
                  <div className="flex items-center justify-between text-xs text-white pt-1 border-t border-white/20">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Est. Cost</span>
                      <span className="font-extrabold text-amber-300">{reel.budget}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Duration</span>
                      <span className="font-extrabold text-white">{reel.duration}</span>
                    </div>
                  </div>

                  {/* 1-Click "Plan with this Vibe" Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStartChatWithPrompt) {
                        onStartChatWithPrompt(reel.prompt);
                      }
                    }}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plan this Vibe</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          SECTION 2: INTERACTIVE STATE & DESTINATION SELECTOR PILLS
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-rose-600" />
            <h2 className="font-display text-xl font-bold text-stone-900">Regional Explorer & Guide Atlas</h2>
          </div>
          <span className="text-xs text-stone-500 font-semibold">{destinations.length} Verified Hubs</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {destinations.map(d => (
            <button
              key={d.id}
              id={`dest-selector-pill-${d.slug}`}
              onClick={() => handleSelectDestination(d)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                selectedDest?.id === d.id
                  ? 'bg-stone-900 text-white shadow-md ring-2 ring-stone-900/20'
                  : 'bg-white/90 hover:bg-rose-50 border border-stone-200/90 text-stone-700'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${selectedDest?.id === d.id ? 'text-rose-400' : 'text-stone-400'}`} />
              <span>{d.name}</span>
              <span className={`text-[10px] font-normal ${selectedDest?.id === d.id ? 'text-stone-300' : 'text-stone-400'}`}>
                ({d.state_region})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          SECTION 3: IMMERSIVE DESTINATION HERO & SUB-GUIDE TABS
         ------------------------------------------------------------- */}
      {selectedDest && (
        <div className="space-y-6">
          
          {/* Destination Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white min-h-[360px] flex flex-col justify-end p-6 sm:p-10 shadow-xl">
            <img
              src={selectedDest.hero_image_url || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=80'}
              alt={selectedDest.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-transparent" />

            <div className="relative z-10 space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white shadow-xs border border-white/20">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{selectedDest.state_region}, {selectedDest.country}</span>
              </div>
              
              <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                {selectedDest.name}
              </h2>
              
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-2xl">
                {selectedDest.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-xs text-stone-200 font-medium">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Best Season: <strong>{selectedDest.best_time_to_visit || 'October to May'}</strong></span>
                </div>

                <button
                  id="plan-trip-for-current-dest-btn"
                  onClick={() => onPlanTripForDestination(selectedDest)}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Plan {selectedDest.name} Itinerary with Layla</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Guide Layla Pill Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-stone-200/60 rounded-full overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveGuideTab('overview')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeGuideTab === 'overview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Overview & Highlights
            </button>
            <button
              onClick={() => setActiveGuideTab('stays')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'stays' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bed className="w-3.5 h-3.5 text-rose-500" />
              <span>Verified Stays ({hotels.length})</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('experiences')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'experiences' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Mountain className="w-3.5 h-3.5 text-orange-500" />
              <span>Signature Experiences ({activities.length})</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('cuisine')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'cuisine' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              <span>Iconic Cuisine</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('mobility')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'mobility' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-cyan-500" />
              <span>Mobility & Chauffeurs ({transport.length})</span>
            </button>
          </div>

          {/* Sub-Guide Panel Display */}
          <div className="space-y-6">
            
            {/* 1. OVERVIEW & CURATED HIGHLIGHTS */}
            {activeGuideTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    Why Travel to {selectedDest.name}?
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {selectedDest.description} Whether seeking peaceful nature retreats, exhilarating outdoor sports, or rich centuries-old cultural heritage, {selectedDest.name} offers seamless travel with certified boutique accommodations and private chauffeurs.
                  </p>
                  
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                    {selectedDest.tags?.map((tag, tIdx) => (
                      <span key={tIdx} className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold capitalize border border-rose-100">
                        #{tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200/70 shadow-xs space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">AI Quick Suggestion</span>
                  <h4 className="font-display text-base font-bold text-stone-900">
                    Ready to plan {selectedDest.name}?
                  </h4>
                  <p className="text-xs text-stone-600">
                    Our AI automatically matches optimal weather windows, road conditions, and boutique stays for your budget.
                  </p>
                  <button
                    onClick={() => onPlanTripForDestination(selectedDest)}
                    className="w-full py-2.5 rounded-full bg-stone-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Launch Planner
                  </button>
                </div>
              </div>
            )}

            {/* 2. STAYS & ACCOMMODATIONS */}
            {activeGuideTab === 'stays' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotels.map(h => (
                  <div key={h.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-rose-300 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase">{h.category}</span>
                          <h4 className="font-display text-base font-bold text-stone-900 mt-1.5">{h.name}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{h.rating}</span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{h.description}</p>

                      <div className="flex flex-wrap gap-1">
                        {h.amenities?.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900 text-sm">₹{h.price_per_night?.toLocaleString()} / night</span>
                      <button
                        onClick={() => onStartChatWithPrompt?.(`Book a stay at ${h.name} in ${selectedDest.name}`)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Select</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. EXPERIENCES & ACTIVITIES */}
            {activeGuideTab === 'experiences' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map(a => (
                  <div key={a.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-orange-300 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-extrabold uppercase">{a.category}</span>
                          <h4 className="font-display text-base font-bold text-stone-900 mt-1.5">{a.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{a.rating}</span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{a.description}</p>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500 font-medium">
                        <span>Duration: <strong>{a.duration_hours}h</strong></span>
                        <span>&bull;</span>
                        <span>Difficulty: <strong className="capitalize">{a.difficulty_level}</strong></span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900 text-sm">₹{a.price_per_person?.toLocaleString()} / person</span>
                      <button
                        onClick={() => onStartChatWithPrompt?.(`Add ${a.title} to my ${selectedDest.name} trip itinerary`)}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Add to Trip</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. ICONIC CUISINE HIGHLIGHTS */}
            {activeGuideTab === 'cuisine' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentCuisines.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-start gap-4 hover:border-amber-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-2xl flex items-center justify-center shrink-0 border border-amber-100">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-sm text-stone-900">{item.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px] uppercase">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. MOBILITY & TRANSFERS */}
            {activeGuideTab === 'mobility' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {transport.map(t => (
                  <div key={t.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-cyan-300 transition-colors">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[10px] font-extrabold uppercase">{t.type.replace('_', ' ')}</span>
                      <h4 className="font-display text-base font-bold text-stone-900 mt-1.5">{t.name}</h4>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/60 text-xs space-y-1">
                      <p className="text-stone-700 font-medium">Route: <strong>{t.route_from}</strong> &rarr; <strong>{t.route_to}</strong></p>
                      <p className="text-stone-500 text-[11px]">Duration: ~{t.duration_hours} hours &bull; Capacity: {t.capacity} passengers</p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-400">Verified Chauffeur</span>
                      <span className="font-bold text-stone-900 text-sm">₹{t.price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
