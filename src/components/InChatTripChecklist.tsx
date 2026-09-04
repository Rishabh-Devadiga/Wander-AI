import React from 'react';
import { Check, Sparkles, Calendar, MapPin, Users, Clock, DollarSign, ArrowRight, SlidersHorizontal, Plus, Minus, IndianRupee } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { getDestinationPhotos } from '../utils/imageCatalog';
import { parseBudget } from '../utils/validation';

export interface ChecklistState {
  where_to: string | null;
  where_from: string | null;
  who_is_coming: string | null;
  when_you_go: string | null;
  what_you_are_after: string | null;
  travel_dates: string | null;
  start_date: string | null;
  end_date: string | null;
  travel_month?: string | null;
  is_dates_valid: boolean;
  is_ready_to_generate?: boolean;
}

export interface InChatTripChecklistProps {
  checklist: ChecklistState;
  capturedCount: number;
  progressPercent: number;
  onSelectDestination: (destination: string) => void;
  onSelectOrigin: (city: string) => void;
  onSelectTravelers: (travelers: string) => void;
  onSelectBudget: (budget: string) => void;
  onSelectDuration: (dur: string) => void;
  onSelectDatesModal: () => void;
  onQuickDates: (datesStr: string) => void;
  onGenerateTrip: () => void;
  isGenerating?: boolean;
}

export const InChatTripChecklist: React.FC<InChatTripChecklistProps> = ({
  checklist,
  capturedCount,
  progressPercent,
  onSelectDestination,
  onSelectOrigin,
  onSelectTravelers,
  onSelectBudget,
  onSelectDuration,
  onSelectDatesModal,
  onQuickDates,
  onGenerateTrip,
  isGenerating = false,
}) => {
  const [editingField, setEditingField] = React.useState<string | null>(null);

  // Extract current numerical budget
  const initialBudgetValue = React.useMemo(() => {
    if (!checklist.what_you_are_after) return 75000;
    const parsed = parseBudget(checklist.what_you_are_after);
    return parsed && parsed > 0 ? parsed : 75000;
  }, [checklist.what_you_are_after]);

  const [customBudgetVal, setCustomBudgetVal] = React.useState<number>(initialBudgetValue);
  const [budgetInputStr, setBudgetInputStr] = React.useState<string>(initialBudgetValue.toString());
  const [destinationSearch, setDestinationSearch] = React.useState<string>('');
  const [originSearch, setOriginSearch] = React.useState<string>('');

  // Custom traveler state
  const initialTravelerNum = React.useMemo(() => {
    const match = checklist.who_is_coming?.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    if (checklist.who_is_coming?.toLowerCase().includes('couple')) return 2;
    if (checklist.who_is_coming?.toLowerCase().includes('solo')) return 1;
    return 2;
  }, [checklist.who_is_coming]);

  const [customTravelersCount, setCustomTravelersCount] = React.useState<number>(initialTravelerNum);
  const [customTravelerInputStr, setCustomTravelerInputStr] = React.useState<string>(initialTravelerNum.toString());
  const [customGroupType, setCustomGroupType] = React.useState<'solo' | 'couple' | 'family' | 'friends' | 'group'>('family');

  // Sync state when checklist budget changes externally
  React.useEffect(() => {
    if (checklist.what_you_are_after) {
      const parsed = parseBudget(checklist.what_you_are_after);
      if (parsed && parsed > 0) {
        setCustomBudgetVal(parsed);
        setBudgetInputStr(parsed.toString());
      }
    }
  }, [checklist.what_you_are_after]);

  // Sync state when checklist who_is_coming changes externally
  React.useEffect(() => {
    if (checklist.who_is_coming) {
      const match = checklist.who_is_coming.match(/\d+/);
      const count = match ? parseInt(match[0], 10) : (checklist.who_is_coming.toLowerCase().includes('solo') ? 1 : 2);
      setCustomTravelersCount(count);
      setCustomTravelerInputStr(count.toString());
      if (checklist.who_is_coming.toLowerCase().includes('solo') || count === 1) setCustomGroupType('solo');
      else if (checklist.who_is_coming.toLowerCase().includes('couple') || count === 2) setCustomGroupType('couple');
      else if (checklist.who_is_coming.toLowerCase().includes('family')) setCustomGroupType('family');
      else if (checklist.who_is_coming.toLowerCase().includes('friends')) setCustomGroupType('friends');
      else setCustomGroupType('group');
    }
  }, [checklist.who_is_coming]);

  // Extract traveler count for per-person calculations
  const travelerCount = React.useMemo(() => {
    const match = checklist.who_is_coming?.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    if (checklist.who_is_coming?.toLowerCase().includes('couple')) return 2;
    if (checklist.who_is_coming?.toLowerCase().includes('solo')) return 1;
    return customTravelersCount > 0 ? customTravelersCount : 2;
  }, [checklist.who_is_coming, customTravelersCount]);

  const handleApplyCustomTravelers = (count: number, groupType = customGroupType) => {
    const clamped = Math.max(1, Math.min(100, count));
    let typeLabel = 'Travelers';
    if (clamped === 1 || groupType === 'solo') typeLabel = 'Solo Traveler';
    else if (clamped === 2 && groupType === 'couple') typeLabel = 'Couple';
    else if (groupType === 'family') typeLabel = 'Family';
    else if (groupType === 'friends') typeLabel = 'Friends';
    else typeLabel = 'Group';

    const formatted = clamped === 1 && (groupType === 'solo' || typeLabel === 'Solo Traveler')
      ? '1 Solo Traveler' 
      : `${clamped} Travelers (${typeLabel})`;
      
    onSelectTravelers(formatted);
    setEditingField(null);
  };

  const handleApplyCustomBudget = (val: number) => {
    const clamped = Math.max(5000, Math.min(1000000, val));
    setCustomBudgetVal(clamped);
    setBudgetInputStr(clamped.toString());
    onSelectBudget(`Budget ₹${clamped.toLocaleString('en-IN')}`);
    setEditingField(null);
  };

  const isDatesProvided = Boolean(
    checklist.travel_dates &&
    checklist.travel_dates.trim() !== '' &&
    checklist.start_date &&
    checklist.end_date
  );

  const photoSet = checklist.where_to ? getDestinationPhotos(checklist.where_to) : null;

  return (
    <div 
      id="in-chat-trip-checklist"
      className="w-full rounded-3xl bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE]/50 to-white border border-[#DDD6FE] p-4 sm:p-6 shadow-sm space-y-4 my-3 text-stone-900 transition-all"
    >
      {/* Top Header with Progress */}
      <div className="flex items-center justify-between gap-3 border-b border-purple-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#EDE9FE] text-[#5B21B6]">
              Trip Checklist
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              Direct in chat
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#0F172A] tracking-tight mt-0.5">
            Your trip is taking shape
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-xs font-black text-[#0F172A] block">
              {capturedCount} of 6
            </span>
            <span className="text-[10px] text-stone-500 font-medium">
              captured
            </span>
          </div>
          <div className="relative w-10 h-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-purple-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#7065F0] transition-all duration-500 ease-out"
                strokeDasharray={`${progressPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-extrabold text-[11px] text-[#0F172A]">
              {capturedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Rows */}
      <div className="space-y-3.5 pt-1">
        {/* 1. Destination */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            checklist.where_to ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            {checklist.where_to ? <Check className="w-3 h-3 stroke-[3]" /> : <span>1</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Destination
              </span>
              {checklist.where_to && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'destination' ? null : 'destination')}
                  className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer"
                >
                  {editingField === 'destination' ? 'Close' : 'Change destination'}
                </button>
              )}
            </div>
            {checklist.where_to && editingField !== 'destination' ? (
              <div>
                <p className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                  {checklist.where_to}
                </p>
                {photoSet && (
                  <div className="mt-2 p-2 rounded-2xl bg-white/90 border border-purple-100/90 shadow-2xs flex items-center gap-3">
                    <SmartImage
                      src={photoSet.hero}
                      alt={checklist.where_to}
                      className="w-16 h-12 rounded-xl object-cover"
                      containerClassName="w-16 h-12 rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-[#0F172A] line-clamp-1 block">
                        {checklist.where_to}
                      </span>
                      <span className="text-[11px] text-[#7065F0] font-medium line-clamp-1 mt-0.5">
                        {photoSet.weatherSummary || photoSet.caption}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {/* Search input for destination */}
                <div className="relative">
                  <input
                    type="text"
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && destinationSearch.trim()) {
                        e.preventDefault();
                        onSelectDestination(destinationSearch.trim());
                        setEditingField(null);
                        setDestinationSearch('');
                      }
                    }}
                    placeholder="Search or type any destination (e.g. Darjeeling, Puri, Bali, Thailand)..."
                    className="w-full pl-3 pr-24 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
                  />
                  {destinationSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDestination(destinationSearch.trim());
                        setEditingField(null);
                        setDestinationSearch('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#7065F0] hover:bg-[#5B21B6] text-white text-[10px] font-bold cursor-pointer transition-all"
                    >
                      Use Place
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 font-medium">
                    Popular destinations:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {[
                      'Darjeeling', 'Puri', 'Goa', 'Manali', 'Kashmir', 'Kerala', 
                      'Bali', 'Thailand', 'Uttar Pradesh', 'Rajasthan', 'Varanasi',
                      'Dubai', 'Singapore', 'Japan', 'China', 'Switzerland', 'Ladakh',
                      'Ooty', 'Shimla', 'Rishikesh', 'Sikkim', 'Andaman', 'Maldives'
                    ]
                      .filter((d) => !destinationSearch || d.toLowerCase().includes(destinationSearch.toLowerCase().trim()))
                      .map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            onSelectDestination(d);
                            setEditingField(null);
                            setDestinationSearch('');
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            checklist.where_to?.toLowerCase() === d.toLowerCase()
                              ? 'bg-[#7065F0] text-white shadow-xs'
                              : 'bg-white border border-stone-200 text-stone-800 hover:border-[#7065F0] hover:text-[#7065F0]'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Origin */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            checklist.where_from ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            {checklist.where_from ? <Check className="w-3 h-3 stroke-[3]" /> : <span>2</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Origin (Departure City)
              </span>
              {checklist.where_from && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'origin' ? null : 'origin')}
                  className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer"
                >
                  {editingField === 'origin' ? 'Close' : 'Change origin'}
                </button>
              )}
            </div>
            {checklist.where_from && editingField !== 'origin' ? (
              <p className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                From {checklist.where_from}
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {/* Search input for origin */}
                <div className="relative">
                  <input
                    type="text"
                    value={originSearch}
                    onChange={(e) => setOriginSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && originSearch.trim()) {
                        e.preventDefault();
                        onSelectOrigin(originSearch.trim());
                        setEditingField(null);
                        setOriginSearch('');
                      }
                    }}
                    placeholder="Search or type departure city (e.g. Pune, Hyderabad, London)..."
                    className="w-full pl-3 pr-20 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
                  />
                  {originSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectOrigin(originSearch.trim());
                        setEditingField(null);
                        setOriginSearch('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#7065F0] hover:bg-[#5B21B6] text-white text-[10px] font-bold cursor-pointer"
                    >
                      Use City
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 font-medium">
                    Popular origins:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {[
                      'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 
                      'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi', 
                      'Goa', 'Guwahati', 'Indore', 'Dubai', 'Singapore', 'London', 'New York'
                    ]
                      .filter((city) => !originSearch || city.toLowerCase().includes(originSearch.toLowerCase().trim()))
                      .map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            onSelectOrigin(city);
                            setEditingField(null);
                            setOriginSearch('');
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            checklist.where_from?.toLowerCase() === city.toLowerCase()
                              ? 'bg-[#7065F0] text-white shadow-xs'
                              : 'bg-white border border-stone-200 text-stone-800 hover:border-[#7065F0] hover:text-[#7065F0]'
                          }`}
                        >
                          From {city}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Travelers */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            checklist.who_is_coming ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            {checklist.who_is_coming ? <Check className="w-3 h-3 stroke-[3]" /> : <span>3</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Travelers
              </span>
              {checklist.who_is_coming && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'travelers' ? null : 'travelers')}
                  className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer"
                >
                  {editingField === 'travelers' ? 'Close' : 'Change travelers'}
                </button>
              )}
            </div>
            {checklist.who_is_coming && editingField !== 'travelers' ? (
              <p className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                {checklist.who_is_coming}
              </p>
            ) : (
              <div className="space-y-3 pt-1.5 p-3 rounded-2xl bg-white/90 border border-purple-100 shadow-2xs">
                {/* Stepper + Direct Numerical Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-800">
                      Specify Number of People
                    </span>
                    <span className="text-xs font-black text-[#7065F0]">
                      {customTravelersCount} {customTravelersCount === 1 ? 'Person' : 'People'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, customTravelersCount - 1);
                        setCustomTravelersCount(next);
                        setCustomTravelerInputStr(next.toString());
                      }}
                      className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                      title="Decrease travelers"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={customTravelerInputStr}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCustomTravelerInputStr(raw);
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setCustomTravelersCount(Math.min(100, parsed));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(customTravelerInputStr, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            const clamped = Math.min(100, Math.max(1, parsed));
                            setCustomTravelersCount(clamped);
                            setCustomTravelerInputStr(clamped.toString());
                          } else {
                            setCustomTravelerInputStr(customTravelersCount.toString());
                          }
                        }}
                        placeholder="Enter number of people"
                        className="w-full px-3 py-1.5 text-center rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(100, customTravelersCount + 1);
                        setCustomTravelersCount(next);
                        setCustomTravelerInputStr(next.toString());
                      }}
                      className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                      title="Increase travelers"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyCustomTravelers(customTravelersCount)}
                      className="px-3 py-1.5 rounded-xl bg-[#7065F0] hover:bg-[#5B21B6] text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
                    >
                      Set {customTravelersCount} {customTravelersCount === 1 ? 'Traveler' : 'Travelers'}
                    </button>
                  </div>
                </div>

                {/* Group Type Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Travel Group Type
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'solo', label: 'Solo', count: 1 },
                      { id: 'couple', label: 'Couple', count: 2 },
                      { id: 'family', label: 'Family', count: Math.max(3, customTravelersCount) },
                      { id: 'friends', label: 'Friends', count: Math.max(3, customTravelersCount) },
                      { id: 'group', label: 'Tour Group', count: Math.max(6, customTravelersCount) },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setCustomGroupType(g.id as any);
                          setCustomTravelersCount(g.count);
                          setCustomTravelerInputStr(g.count.toString());
                          handleApplyCustomTravelers(g.count, g.id as any);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          customGroupType === g.id
                            ? 'bg-purple-100 text-[#5B21B6] border border-purple-300'
                            : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comprehensive Quick-Select Options */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Popular Group Sizes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Solo (1 Person)', count: 1, type: 'solo' },
                      { label: 'Couple (2 People)', count: 2, type: 'couple' },
                      { label: 'Family (3 People)', count: 3, type: 'family' },
                      { label: 'Family (4 People)', count: 4, type: 'family' },
                      { label: 'Family (5 People)', count: 5, type: 'family' },
                      { label: 'Friends (3 People)', count: 3, type: 'friends' },
                      { label: 'Friends (4 People)', count: 4, type: 'friends' },
                      { label: 'Friends (6 People)', count: 6, type: 'friends' },
                      { label: 'Group (8 People)', count: 8, type: 'group' },
                      { label: 'Group (10+ People)', count: 10, type: 'group' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setCustomTravelersCount(opt.count);
                          setCustomTravelerInputStr(opt.count.toString());
                          setCustomGroupType(opt.type as any);
                          handleApplyCustomTravelers(opt.count, opt.type as any);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          checklist.who_is_coming?.toLowerCase().includes(`${opt.count}`) && checklist.who_is_coming?.toLowerCase().includes(opt.type.slice(0, 4))
                            ? 'bg-[#7065F0] text-white shadow-xs'
                            : 'bg-white border border-stone-200 text-stone-800 hover:border-[#7065F0] hover:text-[#7065F0]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Duration */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            checklist.when_you_go ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            {checklist.when_you_go ? <Check className="w-3 h-3 stroke-[3]" /> : <span>4</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Duration
              </span>
              {checklist.when_you_go && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'duration' ? null : 'duration')}
                  className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer"
                >
                  {editingField === 'duration' ? 'Close' : 'Change duration'}
                </button>
              )}
            </div>
            {checklist.when_you_go && editingField !== 'duration' ? (
              <p className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                {checklist.when_you_go}
              </p>
            ) : (
              <div className="space-y-1.5 pt-0.5">
                <p className="text-xs text-stone-500">
                  Select trip duration:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['5 days', '7 days', '10 days'].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => {
                        onSelectDuration(dur);
                        setEditingField(null);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        checklist.when_you_go?.toLowerCase().includes(dur.toLowerCase())
                          ? 'bg-[#7065F0] text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-800 hover:border-[#7065F0] hover:text-[#7065F0]'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Budget */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            checklist.what_you_are_after ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            {checklist.what_you_are_after ? <Check className="w-3 h-3 stroke-[3]" /> : <span>5</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Target Budget
              </span>
              {checklist.what_you_are_after && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'budget' ? null : 'budget')}
                  className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{editingField === 'budget' ? 'Done' : 'Adjust budget'}</span>
                </button>
              )}
            </div>

            {checklist.what_you_are_after && editingField !== 'budget' ? (
              <div className="space-y-1.5 mt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm sm:text-base font-black text-[#0F172A]">
                    {checklist.what_you_are_after}
                  </p>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                    ~₹{Math.round(customBudgetVal / travelerCount).toLocaleString('en-IN')}/person
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingField('budget')}
                    className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-[#7065F0] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-purple-200"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Adjust Budget</span>
                  </button>
                </div>
                
                {/* Quick preset switches */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-stone-400 font-semibold">Quick switch:</span>
                  {[35000, 50000, 75000, 100000, 150000].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleApplyCustomBudget(b)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        customBudgetVal === b
                          ? 'bg-[#7065F0] text-white shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      ₹{b.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1.5 p-3 rounded-2xl bg-white/90 border border-purple-100 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">
                      Select or Customize Your Budget
                    </span>
                    <span className="text-xs font-black text-[#7065F0]">
                      ₹{customBudgetVal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Estimated ~₹{Math.round(customBudgetVal / travelerCount).toLocaleString('en-IN')} per person for {travelerCount} traveler{travelerCount > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Interactive Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="15000"
                    max="300000"
                    step="2500"
                    value={customBudgetVal}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCustomBudgetVal(val);
                      setBudgetInputStr(val.toString());
                    }}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#7065F0]"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-bold">
                    <span>₹15,000 (Economy)</span>
                    <span>₹1,50,000</span>
                    <span>₹3,00,000+ (Luxury)</span>
                  </div>
                </div>

                {/* Direct Custom Amount Input + Steppers */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(10000, customBudgetVal - 5000);
                      setCustomBudgetVal(next);
                      setBudgetInputStr(next.toString());
                    }}
                    className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                    title="Decrease by ₹5,000"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="text"
                      value={budgetInputStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setBudgetInputStr(raw);
                        const parsed = parseInt(raw, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setCustomBudgetVal(parsed);
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseInt(budgetInputStr, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          handleApplyCustomBudget(parsed);
                        } else {
                          setBudgetInputStr(customBudgetVal.toString());
                        }
                      }}
                      placeholder="Enter custom budget (e.g. 65000)"
                      className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(1000000, customBudgetVal + 5000);
                      setCustomBudgetVal(next);
                      setBudgetInputStr(next.toString());
                    }}
                    className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                    title="Increase by ₹5,000"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyCustomBudget(customBudgetVal)}
                    className="px-3 py-1.5 rounded-xl bg-[#7065F0] hover:bg-[#5B21B6] text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
                  >
                    Set Budget
                  </button>
                </div>

                {/* Popular Quick-Preset Pills */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Quick Budget Brackets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[35000, 50000, 75000, 100000, 150000, 200000].map((bVal) => (
                      <button
                        key={bVal}
                        type="button"
                        onClick={() => handleApplyCustomBudget(bVal)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          customBudgetVal === bVal
                            ? 'bg-[#7065F0] text-white shadow-xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:border-[#7065F0] hover:text-[#7065F0]'
                        }`}
                      >
                        ₹{bVal.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. Travel Dates */}
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
            isDatesProvided ? 'bg-emerald-600 text-white' : 'bg-amber-100 border border-amber-500 text-amber-900'
          }`}>
            {isDatesProvided ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                isDatesProvided ? 'text-stone-500' : 'text-amber-800'
              }`}>
                Travel Dates
              </span>
              <button
                type="button"
                onClick={onSelectDatesModal}
                className="text-xs font-bold text-[#7065F0] hover:text-[#5B21B6] underline cursor-pointer"
              >
                {isDatesProvided ? 'Change dates' : 'Select dates'}
              </button>
            </div>
            {isDatesProvided ? (
              <p className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                {checklist.travel_dates}
              </p>
            ) : (
              <div className="space-y-1.5 pt-0.5">
                <p className="text-xs text-amber-900">
                  Exact dates help lock live flight/train fares:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={onSelectDatesModal}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#5B21B6] border border-purple-200 hover:bg-[#DDD6FE] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Pick Dates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickDates('Sep 21 to Sep 26')}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-stone-200 hover:border-[#7065F0] text-stone-700 transition-colors cursor-pointer"
                  >
                    Sep 21 – Sep 26 (6 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickDates('Oct 10 to Oct 15')}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-stone-200 hover:border-[#7065F0] text-stone-700 transition-colors cursor-pointer"
                  >
                    Oct 10 – Oct 15 (6 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickDates('Nov 5 to Nov 11')}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-stone-200 hover:border-[#7065F0] text-stone-700 transition-colors cursor-pointer"
                  >
                    Nov 5 – Nov 11 (7 Days)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Generate Action Button */}
      <div className="pt-2 border-t border-purple-100">
        <button
          id="in-chat-generate-trip-btn"
          type="button"
          onClick={onGenerateTrip}
          disabled={isGenerating}
          className="w-full py-3.5 px-5 rounded-2xl bg-[#0F172A] hover:bg-black text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
          <span>{isGenerating ? 'Generating Itinerary...' : 'Generate My Trip'}</span>
        </button>
        <p className="text-[11px] text-stone-500 text-center mt-2">
          Instantly generates verified routes, stays, and day-by-day itineraries.
        </p>
      </div>
    </div>
  );
};
