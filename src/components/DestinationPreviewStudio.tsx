import React from 'react';
import { Sparkles, MapPin, Compass, Navigation, Bed, Sun, ShieldCheck, ArrowRight, Calendar, SlidersHorizontal, IndianRupee, Plus, Minus } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { getDestinationPhotos } from '../utils/imageCatalog';
import { ChecklistState } from './InChatTripChecklist';
import { parseBudget } from '../utils/validation';

export interface DestinationPreviewStudioProps {
  checklist: ChecklistState;
  onGenerateTrip: () => void;
  onPickDates: () => void;
  onSelectBudget?: (budgetStr: string) => void;
}

export const DestinationPreviewStudio: React.FC<DestinationPreviewStudioProps> = ({
  checklist,
  onGenerateTrip,
  onPickDates,
  onSelectBudget,
}) => {
  const destName = checklist.where_to || 'Uttar Pradesh';
  const photoSet = getDestinationPhotos(destName);

  // Extract current numerical budget
  const currentBudgetValue = React.useMemo(() => {
    if (!checklist.what_you_are_after) return 75000;
    const parsed = parseBudget(checklist.what_you_are_after);
    return parsed && parsed > 0 ? parsed : 75000;
  }, [checklist.what_you_are_after]);

  const [sliderBudget, setSliderBudget] = React.useState<number>(currentBudgetValue);

  React.useEffect(() => {
    setSliderBudget(currentBudgetValue);
  }, [currentBudgetValue]);

  const handleApplyBudget = (val: number) => {
    setSliderBudget(val);
    if (onSelectBudget) {
      onSelectBudget(`Budget ₹${val.toLocaleString('en-IN')}`);
    }
  };

  return (
    <div 
      id="destination-preview-studio"
      className="min-h-full bg-gradient-to-b from-stone-50 via-white to-purple-50/40 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6"
    >
      <div className="space-y-6 max-w-xl mx-auto w-full">
        {/* Live Sync Status Banner */}
        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-between gap-3 text-[#5B21B6] shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#7065F0] animate-pulse shrink-0" />
            <p className="text-xs font-semibold truncate">
              Trip checklist is live directly in your chat stream
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#7065F0] bg-white px-2.5 py-0.5 rounded-full border border-purple-100 shrink-0">
            Syncing
          </span>
        </div>

        {/* Hero Visual Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-stone-200/70 group">
          <div className="h-64 sm:h-72 w-full relative">
            <SmartImage
              src={photoSet.hero}
              alt={destName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              containerClassName="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-stone-900 shadow-sm backdrop-blur-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7065F0]" />
                <span>{destName}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-sm flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>{photoSet.weatherSummary || '22°C - 30°C • Ideal Season'}</span>
              </span>
            </div>

            <div className="absolute bottom-5 left-5 right-5 text-white">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                Explore {destName}
              </h2>
              <p className="text-xs sm:text-sm text-stone-200 font-medium line-clamp-2 mt-1 drop-shadow-xs">
                {photoSet.caption || 'Immerse in timeless heritage, world-class expressways, royal hospitality, and spiritual wonders.'}
              </p>
            </div>
          </div>
        </div>

        {/* Highlight Gallery */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">
              Iconic Highlights
            </h4>
            <span className="text-[11px] font-semibold text-stone-400">
              Verified Destinations
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {photoSet.gallery.slice(0, 3).map((photoUrl, idx) => (
              <div 
                key={idx} 
                className="relative rounded-2xl overflow-hidden h-24 sm:h-28 shadow-2xs border border-stone-200/80 group"
              >
                <SmartImage
                  src={photoUrl}
                  alt={`${destName} highlight ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  containerClassName="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1.5 left-2 text-[10px] sm:text-xs font-bold text-white line-clamp-1 drop-shadow-xs">
                  {idx === 0 ? 'Heritage Wonders' : idx === 1 ? 'Sacred Ghats' : 'Royal Palaces'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Budget Customizer Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-stone-900">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-[#7065F0]">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">
                  Target Trip Budget
                </h4>
                <span className="text-[11px] text-stone-500">
                  Customize your spending ceiling
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-[#7065F0] font-display">
                ₹{sliderBudget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="15000"
              max="350000"
              step="2500"
              value={sliderBudget}
              onChange={(e) => handleApplyBudget(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#7065F0]"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-bold">
              <span>₹15,000 (Economy)</span>
              <span>₹1,75,000</span>
              <span>₹3,50,000+ (Luxury)</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1">
              Presets:
            </span>
            {[35000, 50000, 75000, 100000, 150000, 200000].map((bVal) => (
              <button
                key={bVal}
                type="button"
                onClick={() => handleApplyBudget(bVal)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  sliderBudget === bVal
                    ? 'bg-[#7065F0] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                ₹{bVal.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Road & Connectivity Highlights */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900">
            <Navigation className="w-4 h-4 text-[#7065F0]" />
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">
              Travel Route & Road Connectivity
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Connected via high-speed expressways (Yamuna Expressway, Agra-Lucknow Expressway & Purvanchal Corridor). Ideal for comfortable road journeys by private cab or car.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700">
              🚗 Road & Cab Friendly
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700">
              🚂 Vande Bharat Express
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700">
              ✈️ Direct Airport Hubs
            </span>
          </div>
        </div>

        {/* Handpicked Stays Preview */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900">
              <Bed className="w-4 h-4 text-[#7065F0]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">
                Verified Stays & Resorts
              </h4>
            </div>
            <span className="text-[11px] font-bold text-emerald-600">
              Real-time rates
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Curated selection of heritage havelis, luxury riverside suites, and boutique retreats ready to be tailored to your budget.
          </p>
        </div>
      </div>

      {/* Floating Bottom Quick Action */}
      <div className="max-w-xl mx-auto w-full pt-4 border-t border-stone-200/80">
        <button
          id="preview-studio-generate-btn"
          type="button"
          onClick={onGenerateTrip}
          className="w-full py-4 px-6 rounded-2xl bg-[#0F172A] hover:bg-black text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Generate My Trip</span>
        </button>
        <p className="text-[11px] text-stone-500 text-center mt-2">
          TourFlow AI will assemble day-by-day itineraries, live transport, and stays.
        </p>
      </div>
    </div>
  );
};
