import { useState, useEffect } from 'react';
import { Bed, Mountain, Car, Star, MapPin, RefreshCw, Filter, Sparkles } from 'lucide-react';
import { Hotel, Activity, TransportOption, Destination } from '../types/tourflow';
import { TourFlowApi } from '../services/api';

interface CatalogueExplorerProps {
  onStartChatWithPrompt?: (prompt: string) => void;
  onOpenCreateTrip?: (destName?: string) => void;
}

export default function CatalogueExplorer({ onStartChatWithPrompt, onOpenCreateTrip }: CatalogueExplorerProps = {}) {
  const [activeCategory, setActiveCategory] = useState<'hotels' | 'activities' | 'transport'>('hotels');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transport, setTransport] = useState<TransportOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDestinations();
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [selectedDestId, activeCategory]);

  const loadDestinations = async () => {
    try {
      const data = await TourFlowApi.getDestinations();
      setDestinations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      if (activeCategory === 'hotels') {
        const data = await TourFlowApi.getHotels(selectedDestId || undefined);
        setHotels(data);
      } else if (activeCategory === 'activities') {
        const data = await TourFlowApi.getActivities(selectedDestId || undefined);
        setActivities(data);
      } else {
        const data = await TourFlowApi.getTransport(selectedDestId || undefined);
        setTransport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="catalogue-explorer-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">Catalogue</span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-600 font-bold">WanderFlow Verified Curated Inventory</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-stone-900">Service Catalogue</h1>
        </div>

        {/* Destination Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            id="catalogue-dest-filter-select"
            value={selectedDestId}
            onChange={(e) => setSelectedDestId(e.target.value)}
            className="px-4 py-2 rounded-full bg-white border border-stone-200 text-xs font-bold text-stone-700 shadow-xs focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All Destinations</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.state_region})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Layla Pill Tabs */}
      <div className="flex items-center gap-2 pb-1">
        <button
          id="cat-tab-hotels"
          onClick={() => setActiveCategory('hotels')}
          className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'hotels'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Bed className={`w-3.5 h-3.5 ${activeCategory === 'hotels' ? 'text-rose-400' : 'text-stone-400'}`} />
          <span>Hotels & Stays ({hotels.length})</span>
        </button>

        <button
          id="cat-tab-activities"
          onClick={() => setActiveCategory('activities')}
          className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'activities'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Mountain className={`w-3.5 h-3.5 ${activeCategory === 'activities' ? 'text-orange-400' : 'text-stone-400'}`} />
          <span>Experiences ({activities.length})</span>
        </button>

        <button
          id="cat-tab-transport"
          onClick={() => setActiveCategory('transport')}
          className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'transport'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Car className={`w-3.5 h-3.5 ${activeCategory === 'transport' ? 'text-amber-400' : 'text-stone-400'}`} />
          <span>Mobility & Transport ({transport.length})</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
          <p className="text-xs text-stone-500">Querying PostgreSQL catalog records...</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCategory === 'hotels' && hotels.map(h => (
            <div key={h.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-rose-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase">{h.category}</span>
                  <h3 className="font-display text-base font-bold text-stone-900 mt-1.5">{h.name}</h3>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{h.rating}</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{h.description}</p>

              <div className="flex flex-wrap gap-1 pt-1">
                {h.amenities?.map((amenity, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-stone-600 text-[10px] font-medium border border-stone-200/60">
                    {amenity}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">{h.address || 'Central Valley'}</span>
                <span className="font-bold text-stone-900 text-sm">₹{h.price_per_night?.toLocaleString()} / night</span>
              </div>

              {onStartChatWithPrompt && (
                <button
                  onClick={() => onStartChatWithPrompt(`Plan a trip with accommodation at ${h.name}`)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-700 hover:text-rose-700 font-semibold text-xs border border-stone-200 hover:border-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Plan Trip with this Stay</span>
                </button>
              )}
            </div>
          ))}

          {activeCategory === 'activities' && activities.map(a => (
            <div key={a.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-orange-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-extrabold uppercase">{a.category}</span>
                  <h3 className="font-display text-base font-bold text-stone-900 mt-1.5">{a.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{a.rating}</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{a.description}</p>

              <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1 font-medium">
                <span>Duration: <strong>{a.duration_hours}h</strong></span>
                <span>&bull;</span>
                <span>Difficulty: <strong className="capitalize">{a.difficulty_level}</strong></span>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">Meeting: {a.meeting_point || 'Base Station'}</span>
                <span className="font-bold text-stone-900 text-sm">₹{a.price_per_person?.toLocaleString()} / person</span>
              </div>

              {onStartChatWithPrompt && (
                <button
                  onClick={() => onStartChatWithPrompt(`Include the experience "${a.title}" in my trip itinerary`)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-stone-50 hover:bg-orange-50 text-stone-700 hover:text-orange-700 font-semibold text-xs border border-stone-200 hover:border-orange-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Add to Trip with AI</span>
                </button>
              )}
            </div>
          ))}

          {activeCategory === 'transport' && transport.map(t => (
            <div key={t.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3 hover:border-amber-300 transition-colors">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase">{t.type.replace('_', ' ')}</span>
                <h3 className="font-display text-base font-bold text-stone-900 mt-1.5">{t.name}</h3>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 text-xs space-y-1">
                <p className="text-stone-700 font-medium">Route: <strong>{t.route_from}</strong> &rarr; <strong>{t.route_to}</strong></p>
                <p className="text-stone-500 text-[11px]">Duration: ~{t.duration_hours} hours &bull; Capacity: {t.capacity} passengers</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {t.features?.map((feat, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium">
                    {feat}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">{t.route_from} &rarr; {t.route_to}</span>
                <span className="font-bold text-stone-900 text-sm">₹{t.price?.toLocaleString()}</span>
              </div>

              {onStartChatWithPrompt && (
                <button
                  onClick={() => onStartChatWithPrompt(`Book transport: ${t.name} from ${t.route_from} to ${t.route_to}`)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-700 font-semibold text-xs border border-stone-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Plan Route with this Transport</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

