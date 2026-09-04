import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Plus, 
  ArrowLeftRight, 
  Clock, 
  MapPin, 
  Footprints, 
  Search, 
  Check, 
  Compass, 
  Coffee, 
  Camera, 
  Landmark, 
  Mountain, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { PossibleOptionItem, Trip } from '../types/tourflow';

interface PossibleOptionsTrayProps {
  trip: Trip;
  options: PossibleOptionItem[];
  isLoading?: boolean;
  onAddActivity: (dayNumber: number, option: PossibleOptionItem) => void;
  onSwapWithOption?: (option: PossibleOptionItem) => void;
}

export const PossibleOptionsTray: React.FC<PossibleOptionsTrayProps> = ({
  trip,
  options,
  isLoading = false,
  onAddActivity,
  onSwapWithOption,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDayDropdownId, setActiveDayDropdownId] = useState<string | null>(null);
  const [addedItemSuccess, setAddedItemSuccess] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Curated', icon: Sparkles },
    { id: 'sightseeing', label: 'Sightseeing', icon: Camera },
    { id: 'heritage', label: 'Heritage & Culture', icon: Landmark },
    { id: 'adventure', label: 'Adventure', icon: Mountain },
    { id: 'culinary', label: 'Cafes & Dining', icon: Coffee },
    { id: 'leisure', label: 'Leisure & Tea', icon: Compass },
  ];

  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      const matchesCat = selectedCategory === 'all' || opt.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        opt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.tags && opt.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCat && matchesSearch;
    });
  }, [options, selectedCategory, searchQuery]);

  const daysList = useMemo(() => {
    const daysCount = trip.duration_days || 4;
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [trip.duration_days]);

  const handleAdd = (dayNum: number, opt: PossibleOptionItem) => {
    onAddActivity(dayNum, opt);
    setActiveDayDropdownId(null);
    setAddedItemSuccess(opt.id);
    setTimeout(() => setAddedItemSuccess(null), 2500);
  };

  const getWalkingBadge = (intensity?: string) => {
    switch (intensity) {
      case 'none':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60"><Footprints className="w-3 h-3" /> Zero Incline / Sit-down</span>;
      case 'light':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60"><Footprints className="w-3 h-3" /> Easy Walk</span>;
      case 'moderate':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60"><Footprints className="w-3 h-3" /> Moderate Walk</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60"><Footprints className="w-3 h-3" /> Active Trek</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full"><Footprints className="w-3 h-3" /> Standard Pace</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden mb-8" id="possible-options-tray">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-amber-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100/70 text-rose-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Destination Tray
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {options.length} Live Alternatives Available
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Curated Possible Options & Alternative Sights
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Select, add to specific day legs, or swap into your live schedule with auto-recalculated costs & timelines.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search spots, cafes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-stone-900 placeholder:text-stone-400"
              id="tray-search-input"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
                id={`tray-filter-${cat.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options Grid */}
      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone-500 font-medium">Fetching verified local possibilities...</p>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="py-10 text-center text-stone-500 text-xs">
            No options found matching "{searchQuery}". Try a different filter or search term.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOptions.map((opt) => {
              const isDropdownOpen = activeDayDropdownId === opt.id;
              const isJustAdded = addedItemSuccess === opt.id;

              return (
                <div
                  key={opt.id}
                  className="group bg-white rounded-xl border border-stone-200/80 hover:border-stone-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  id={`tray-card-${opt.id}`}
                >
                  {/* Top Image & Tags */}
                  <div>
                    <div className="relative h-36 w-full overflow-hidden bg-stone-100">
                      <img
                        src={opt.image_url}
                        alt={opt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Price Badge */}
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-white text-sm font-extrabold tracking-tight drop-shadow-sm">
                          ₹{opt.cost.toLocaleString()}
                        </span>
                        <span className="text-white/80 text-[10px] ml-1 font-medium">
                          / person (incl. taxes)
                        </span>
                      </div>

                      {/* Duration Pill */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          <Clock className="w-2.5 h-2.5" />
                          {opt.duration}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {getWalkingBadge(opt.walking_intensity)}
                        {opt.tags && opt.tags[0] && (
                          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                            #{opt.tags[0]}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                        {opt.title}
                      </h4>

                      <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="truncate">{opt.location}</span>
                      </p>

                      <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3.5 pt-0 border-t border-stone-100/80 mt-2">
                    <div className="relative flex items-center gap-2 pt-2.5">
                      {/* Add to Day Dropdown */}
                      <div className="relative flex-1">
                        <button
                          onClick={() => setActiveDayDropdownId(isDropdownOpen ? null : opt.id)}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
                          }`}
                          id={`add-to-day-btn-${opt.id}`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Added!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Day</span>
                              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                            </>
                          )}
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                              Select Day Leg
                            </div>
                            <div className="max-h-44 overflow-y-auto">
                              {daysList.map((dayNum) => (
                                <button
                                  key={dayNum}
                                  onClick={() => handleAdd(dayNum, opt)}
                                  className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-rose-50 hover:text-rose-700 font-semibold flex items-center justify-between transition-colors"
                                  id={`day-select-btn-${opt.id}-d${dayNum}`}
                                >
                                  <span>Day {dayNum} Schedule</span>
                                  <Plus className="w-3 h-3 text-stone-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Swap Action (if parent supports modal) */}
                      {onSwapWithOption && (
                        <button
                          onClick={() => onSwapWithOption(opt)}
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition-colors"
                          title="Swap with existing itinerary item"
                          id={`swap-with-btn-${opt.id}`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Live Calculation Notice */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-2">
          <div className="flex items-center gap-1.5 text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Adding or removing any activity automatically reschedules start & end times and updates total budget breakdown.</span>
          </div>
          <span className="text-stone-400 font-mono text-[10px]">
            WanderFlow Sync v2.0
          </span>
        </div>
      </div>
    </div>
  );
};
