import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  IndianRupee, 
  Users, 
  MapPin, 
  Compass, 
  Clock, 
  Check, 
  ChevronDown, 
  Search, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { Destination, Trip } from '../types/tourflow';
import { TourFlowApi } from '../services/api';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  initialDestinationId?: string;
  initialPreferences?: Record<string, any>;
  editingTrip?: Trip | null;
  onTripCreatedOrUpdated: (trip: Trip) => void;
  onStartChatWithTripPayload?: (payload: any) => void;
}

// Curated Destination Interest Knowledge Base for dynamic interest fetching
const DESTINATION_SPECIFIC_INTERESTS: Record<string, string[]> = {
  darjeeling: [
    'Tea Gardens',
    'Himalayan Toy Train',
    'Tiger Hill Sunrise',
    'Kanchenjunga Views',
    'Tibetan Monasteries',
    'Artisan Tea Tasting',
    'Cable Car Ride',
    'Peace Pagoda',
    'Local Bazaars',
  ],
  manali: [
    'Snow Activities',
    'Solang Valley Paragliding',
    'Atal Tunnel & Sissu',
    'Old Manali Bohemian Cafes',
    'River Rafting in Beas',
    'Jogini Waterfalls Trek',
    'Vashisht Hot Springs',
    'Hadimba Temple',
  ],
  goa: [
    'Golden Sand Beaches',
    'Water Sports & Jetski',
    'Portuguese Heritage Villas',
    'Sunset River Cruises',
    'Night Markets & Live Music',
    'Fresh Coastal Seafood',
    'Spice Plantation Walks',
    'Scuba Diving at Grande Island',
  ],
  kerala: [
    'Alleppey Houseboat Backwaters',
    'Munnar Emerald Tea Estates',
    'Ayurvedic Rejuvenation Spa',
    'Kathakali Cultural Dance',
    'Varkala Cliff Beach',
    'Periyar Wildlife Safari',
    'Cardamom Spice Trails',
    'Cheenavala Chinese Fishing Nets',
  ],
  rajasthan: [
    'Royal Palace Tours',
    'Thar Desert Camel Safari',
    'Monumental Hill Fortresses',
    'Traditional Kalbelia Dance',
    'Opulent Heritage Dining',
    'Blue City & Pink City Walks',
    'Lake Pichola Boat Ride',
    'Handicrafts & Gem Bazaars',
  ],
  kashmir: [
    'Dal Lake Shikara Rides',
    'Gulmarg Gondola & Powder Skiing',
    'Pahalgam Betaab Valley',
    'Traditional Luxury Houseboats',
    'Mughal Heritage Gardens',
    'Saffron & Apple Orchards',
    'Wazwan Culinary Tasting',
    'Sonamarg Glacier Excursion',
  ],
  ladakh: [
    'Pangong Tso Blue Lake',
    'Nubra Valley Sand Dunes',
    'High Altitude Passes (Khardung La)',
    'Ancient Buddhist Gompas',
    'Magnetic Hill & Confluence',
    'Stargazing & Astrophotography',
  ],
  rishikesh: [
    'White Water Ganga Rafting',
    'Evening Ganga Aarti & Ghats',
    'Yoga & Meditation Ashrams',
    'Bungee Jumping & Zipline',
    'Beatles Ashram Heritage Walk',
    'Riverside Camping & Bonfire',
  ],
  varanasi: [
    'Dashashwamedh Ganga Aarti',
    'Subah-e-Banaras Boat Ride',
    'Ancient Ghats & Alley Walks',
    'Banarasi Silk Weaving',
    'Kashi Vishwanath Corridor',
    'Authentic Street Food Trail',
  ],
  andaman: [
    'Radhanagar Beach Sunset',
    'Scuba Diving & Coral Reefs',
    'Cellular Jail Sound & Light',
    'Elephanta Beach Water Sports',
    'Mangrove Kayaking',
    'Island Hopping Cruises',
  ],
};

const DEFAULT_INTEREST_TAGS = [
  'Scenic Viewpoints',
  'Local Culture & Heritage',
  'Authentic Cuisine & Cafes',
  'Nature & Forest Trails',
  'Adventure & Outdoor Sports',
  'Relaxation & Wellness',
  'Photography & Sunsets',
  'Artisan Bazaars & Shopping',
];

const POPULAR_ORIGIN_CITIES = [
  'Mumbai',
  'New Delhi',
  'Bengaluru (Bangalore)',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh',
  'Lucknow',
  'Kochi (Cochin)',
  'Surat',
  'Indore',
  'Nagpur',
  'Bhopal',
  'Patna',
  'Goa',
  'Guwahati',
  'Dehradun',
];

const COMPANION_SUGGESTIONS = [
  { value: 'solo', label: 'Solo', subtitle: 'Independent explorer & flexible pacing' },
  { value: 'couple', label: 'Couple', subtitle: 'Romantic retreat & scenic privacy' },
  { value: 'family', label: 'Family', subtitle: 'Family-friendly stays & balanced activities' },
  { value: 'friends', label: 'Friends', subtitle: 'Shared adventures, nightlife & group excursions' },
  { value: 'group', label: 'Group / Colleagues', subtitle: 'Corporate retreat or extended group journey' },
];

const PACE_SUGGESTIONS = [
  { value: 'relaxed', label: 'Relaxed', subtitle: 'Leisurely mornings, unhurried sightseeing & downtime' },
  { value: 'balanced', label: 'Balanced', subtitle: 'Curated mix of major highlights and free time' },
  { value: 'packed', label: 'Packed & Active', subtitle: 'High energy, early starts & maximum attractions' },
  { value: 'fast_paced', label: 'Fast-Paced Explorer', subtitle: 'Multi-destination discovery with packed day trips' },
];

// Helper: Format raw number into Indian Numbering System (e.g. ₹1,50,000)
function formatToIndianCurrency(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const cleanStr = String(val).replace(/[^0-9]/g, '');
  if (!cleanStr) return '';
  const num = parseInt(cleanStr, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

// Helper: Parse currency formatted string to number
function parseIndianCurrency(val: string): number {
  const clean = val.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export default function CreateTripModal({
  isOpen,
  onClose,
  destinations,
  initialDestinationId,
  initialPreferences,
  editingTrip,
  onTripCreatedOrUpdated,
  onStartChatWithTripPayload,
}: CreateTripModalProps) {
  // 1. Initial form state: completely empty when creating new trip
  const [title, setTitle] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [originSearch, setOriginSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [budgetDisplay, setBudgetDisplay] = useState('');
  const [travelerCount, setTravelerCount] = useState<number | ''>('');
  const [companionsInput, setCompanionsInput] = useState('');
  const [paceInput, setPaceInput] = useState('');
  const [budgetTier, setBudgetTier] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');

  // Dropdown visibility states
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showCompanionsDropdown, setShowCompanionsDropdown] = useState(false);
  const [showPaceDropdown, setShowPaceDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);

  const destRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const companionsRef = useRef<HTMLDivElement>(null);
  const paceRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (companionsRef.current && !companionsRef.current.contains(event.target as Node)) {
        setShowCompanionsDropdown(false);
      }
      if (paceRef.current && !paceRef.current.contains(event.target as Node)) {
        setShowPaceDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when editing or opening
  useEffect(() => {
    if (!isOpen) return;

    if (editingTrip) {
      // Pre-fill existing trip details when editing
      setTitle(editingTrip.title || '');
      const dest = destinations.find(d => d.id === editingTrip.destination_id) || editingTrip.destination;
      setSelectedDestinationId(editingTrip.destination_id || '');
      setDestinationSearch(dest?.name || '');
      setOriginSearch(editingTrip.origin || '');
      setStartDate(editingTrip.start_date ? editingTrip.start_date.split('T')[0] : '');
      setEndDate(editingTrip.end_date ? editingTrip.end_date.split('T')[0] : '');
      setDurationDays(editingTrip.duration_days || '');
      setBudgetDisplay(editingTrip.total_budget ? formatToIndianCurrency(editingTrip.total_budget) : '');
      setTravelerCount(editingTrip.traveler_count || '');
      
      const compLabel = COMPANION_SUGGESTIONS.find(c => c.value === editingTrip.travel_type)?.label || editingTrip.travel_type || '';
      setCompanionsInput(compLabel);

      const paceLabel = PACE_SUGGESTIONS.find(p => p.value === editingTrip.pace)?.label || editingTrip.pace || '';
      setPaceInput(paceLabel);

      if (editingTrip.preferences) {
        setBudgetTier(editingTrip.preferences.budget_tier || '');
        setSelectedInterests(editingTrip.preferences.interests || []);
        setSpecialRequests(editingTrip.preferences.special_requests || '');
      }
    } else {
      // STRICT REQUIREMENT: Make all initial modal form fields render empty without pre-filled sample text
      setTitle('');
      setSelectedDestinationId(initialDestinationId || '');
      const initialDest = destinations.find(d => d.id === initialDestinationId);
      setDestinationSearch(initialDest ? initialDest.name : '');
      setOriginSearch('');
      setStartDate('');
      setEndDate('');
      setDurationDays('');
      setBudgetDisplay('');
      setTravelerCount('');
      setCompanionsInput('');
      setPaceInput('');
      setBudgetTier('');
      setSelectedInterests([]);
      setSpecialRequests('');
      setDurationWarning(null);
    }
  }, [isOpen, editingTrip, initialDestinationId, destinations]);

  // Dynamic Interests: Computed whenever destinationSearch / selectedDestinationId changes
  const dynamicAvailableInterests = React.useMemo(() => {
    const cleanSearch = destinationSearch.trim().toLowerCase();
    
    // Check direct key match or slug match
    for (const [key, tags] of Object.entries(DESTINATION_SPECIFIC_INTERESTS)) {
      if (cleanSearch.includes(key) || key.includes(cleanSearch)) {
        return tags;
      }
    }

    // Check in destinations catalog tags
    const matchedDest = destinations.find(
      d => d.name.toLowerCase().includes(cleanSearch) || d.slug.toLowerCase().includes(cleanSearch)
    );
    if (matchedDest && matchedDest.tags && matchedDest.tags.length > 0) {
      return matchedDest.tags.map(t => t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    }

    return DEFAULT_INTEREST_TAGS;
  }, [destinationSearch, destinations]);

  // Date Range calculation & 62-Day Duration Cap
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate) {
      const start = new Date(val);
      const end = new Date(endDate);
      if (end >= start) {
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 62) {
          setDurationDays(62);
          setDurationWarning('Duration capped at 62 days (maximum supported itinerary length).');
        } else {
          setDurationDays(diffDays);
          setDurationWarning(null);
        }
      } else {
        // Automatically align end date to match start date
        setEndDate(val);
        setDurationDays(1);
        setDurationWarning(null);
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val) {
      const start = new Date(startDate);
      const end = new Date(val);
      if (end >= start) {
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 62) {
          setDurationDays(62);
          setDurationWarning('Duration capped at 62 days (maximum supported itinerary length).');
        } else {
          setDurationDays(diffDays);
          setDurationWarning(null);
        }
      } else {
        setStartDate(val);
        setDurationDays(1);
        setDurationWarning(null);
      }
    }
  };

  const handleDurationManualChange = (valStr: string) => {
    if (valStr === '') {
      setDurationDays('');
      setDurationWarning(null);
      return;
    }
    const val = parseInt(valStr, 10);
    if (isNaN(val) || val <= 0) {
      setDurationDays(1);
      setDurationWarning(null);
      return;
    }
    if (val > 62) {
      setDurationDays(62);
      setDurationWarning('Maximum duration is capped at 62 days.');
    } else {
      setDurationDays(val);
      setDurationWarning(null);
    }
  };

  // Indian Currency Budget input handler
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/[^0-9]/g, '');
    if (!cleanDigits) {
      setBudgetDisplay('');
      return;
    }
    setBudgetDisplay(formatToIndianCurrency(cleanDigits));
  };

  // Interest Tag toggle
  const handleToggleInterest = (tag: string) => {
    setSelectedInterests(prev =>
      prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
    );
  };

  // Autocomplete filtering for Destination
  const filteredDestinations = destinations.filter(d => {
    const q = destinationSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.state_region.toLowerCase().includes(q) ||
      d.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  // Autocomplete filtering for Origin Cities
  const filteredOriginCities = POPULAR_ORIGIN_CITIES.filter(city => {
    const q = originSearch.toLowerCase().trim();
    if (!q) return true;
    return city.toLowerCase().includes(q);
  });

  // Autocomplete filtering for Companions
  const filteredCompanions = COMPANION_SUGGESTIONS.filter(c => {
    const q = companionsInput.toLowerCase().trim();
    if (!q) return true;
    return c.label.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q);
  });

  // Autocomplete filtering for Pace
  const filteredPace = PACE_SUGGESTIONS.filter(p => {
    const q = paceInput.toLowerCase().trim();
    if (!q) return true;
    return p.label.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const finalBudget = parseIndianCurrency(budgetDisplay) || 50000;
      const finalDuration = typeof durationDays === 'number' && durationDays > 0 ? Math.min(62, durationDays) : 4;
      const finalTravelers = typeof travelerCount === 'number' && travelerCount > 0 ? travelerCount : 2;
      
      // Match companion value
      const matchedComp = COMPANION_SUGGESTIONS.find(
        c => c.label.toLowerCase() === companionsInput.toLowerCase() || c.value === companionsInput.toLowerCase()
      );
      const travelType = (matchedComp?.value || 'couple') as 'solo' | 'couple' | 'family' | 'friends';

      // Match pace value
      const matchedPace = PACE_SUGGESTIONS.find(
        p => p.label.toLowerCase() === paceInput.toLowerCase() || p.value === paceInput.toLowerCase()
      );
      const paceVal = (matchedPace?.value || 'balanced') as 'relaxed' | 'balanced' | 'packed';

      const finalTitle = title.trim() || `${finalDuration}-Day ${destinationSearch || 'Travel'} Adventure`;
      const destObj = destinations.find(d => d.id === selectedDestinationId || d.name.toLowerCase() === destinationSearch.toLowerCase());

      if (editingTrip) {
        // Update Trip & Preferences
        await TourFlowApi.updateTrip(editingTrip.id, {
          title: finalTitle,
          duration_days: finalDuration,
          total_budget: finalBudget,
          traveler_count: finalTravelers,
          travel_type: travelType,
          origin: originSearch || null,
          start_date: startDate || null,
          end_date: endDate || null,
          pace: paceVal,
        });

        await TourFlowApi.updateTripPreferences(editingTrip.id, {
          budget_tier: (budgetTier as any) || 'moderate',
          travel_companions: travelType,
          interests: selectedInterests,
          special_requests: specialRequests,
        });

        const fullTrip = await TourFlowApi.getTrip(editingTrip.id);
        onTripCreatedOrUpdated(fullTrip);
      } else {
        // Save abstract preferences to memory without polluting fresh form inputs on new sessions
        const abstractTags: string[] = [];
        if (selectedInterests.length > 0) abstractTags.push(...selectedInterests);
        if (budgetTier === 'luxury' || budgetTier === 'ultra_luxury') abstractTags.push('Prefers Luxury');
        if (budgetTier === 'budget') abstractTags.push('Budget Conscious');
        if (paceVal === 'relaxed') abstractTags.push('Relaxed Pace');
        if (paceVal === 'packed') abstractTags.push('Action Packed');
        if (specialRequests && specialRequests.toLowerCase().includes('veg')) abstractTags.push('Vegetarian');
        if (specialRequests && specialRequests.toLowerCase().includes('vegan')) abstractTags.push('Vegan');
        if (specialRequests && specialRequests.toLowerCase().includes('halal')) abstractTags.push('Halal');
        if (specialRequests && specialRequests.toLowerCase().includes('train')) abstractTags.push('Prefers Train');
        if (specialRequests && specialRequests.toLowerCase().includes('flight')) abstractTags.push('Prefers Flight');
        if (specialRequests && specialRequests.toLowerCase().includes('morning')) abstractTags.push('Morning Traveler');
        TourFlowApi.saveAbstractUserPreferences(abstractTags);

        const tripPayload = {
          title: finalTitle,
          originCity: originSearch || 'Mumbai',
          destination: destinationSearch || destObj?.name || 'Manali',
          destinationId: destObj?.id || selectedDestinationId || undefined,
          dates: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            formattedDates: startDate && endDate ? `${startDate} – ${endDate}` : undefined,
          },
          durationDays: finalDuration,
          budget: finalBudget,
          travelerCount: finalTravelers,
          companions: companionsInput || travelType,
          pace: paceInput || paceVal,
          interests: selectedInterests.length > 0 ? selectedInterests : ['Scenic Viewpoints', 'Local Culture'],
          specialRequests: specialRequests || '',
        };

        if (onStartChatWithTripPayload) {
          onStartChatWithTripPayload(tripPayload);
        } else {
          // Fallback create trip
          const created = await TourFlowApi.createTrip({
            title: finalTitle,
            destination_name: destinationSearch || destObj?.name || 'Manali',
            destination_id: destObj?.id || selectedDestinationId || undefined,
            destination: destObj,
            origin: originSearch || 'Mumbai',
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            formatted_dates: startDate && endDate ? `${startDate} – ${endDate}` : undefined,
            duration_days: finalDuration,
            total_budget: finalBudget,
            traveler_count: finalTravelers,
            travel_type: travelType,
            pace: paceVal,
            preferences: {
              budget_tier: (budgetTier as any) || 'moderate',
              travel_companions: travelType,
              interests: selectedInterests.length > 0 ? selectedInterests : ['Scenic Viewpoints', 'Local Culture'],
              special_requests: specialRequests,
            },
          });
          onTripCreatedOrUpdated(created);
        }
      }
      onClose();
    } catch (err: any) {
      alert(`Trip creation error: ${err?.message || 'Please check form inputs.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-50/90 via-orange-50/50 to-amber-50/80 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-display flex items-center gap-2">
                {editingTrip ? 'Modify Trip Parameters' : 'Plan Custom Trip with TourFlow AI'}
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                  Zero Repetition Engine
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {editingTrip 
                  ? 'Update dates, budget, route, and preferences' 
                  : 'Synthesizes non-repetitive schedule, verified stays, and smart budget split'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Trip Title */}
          <div>
            <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1">
              Trip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none bg-stone-50/50"
              placeholder="e.g. 5-Day Winter Mountain Adventure to Manali"
            />
          </div>

          {/* Autocomplete Row: Destination & Origin City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Destination Autocomplete */}
            <div className="relative" ref={destRef}>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                <span>Destination *</span>
                <span className="text-[9px] text-rose-600 font-bold lowercase">Type-ahead search</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={destinationSearch}
                  onFocus={() => setShowDestDropdown(true)}
                  onChange={(e) => {
                    setDestinationSearch(e.target.value);
                    setShowDestDropdown(true);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
                  placeholder="Search destination (e.g. Manali, Goa, Darjeeling)..."
                />
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              {/* Destination Floating Suggestions Dropdown */}
              {showDestDropdown && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-stone-200 max-h-52 overflow-y-auto py-1 text-xs">
                  {filteredDestinations.length > 0 ? (
                    filteredDestinations.map(d => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => {
                          setSelectedDestinationId(d.id);
                          setDestinationSearch(d.name);
                          setShowDestDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-rose-50/80 transition-colors flex items-center justify-between cursor-pointer border-b border-stone-100 last:border-0"
                      >
                        <div>
                          <span className="font-bold text-stone-900">{d.name}</span>
                          <span className="text-[10px] text-stone-500 ml-1.5 font-normal">({d.state_region})</span>
                        </div>
                        {selectedDestinationId === d.id && (
                          <Check className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-stone-500 text-center text-[11px]">
                      Use custom destination &quot;<span className="font-bold text-stone-800">{destinationSearch}</span>&quot;
                      <button
                        type="button"
                        onClick={() => setShowDestDropdown(false)}
                        className="block mx-auto mt-1 text-rose-600 font-bold hover:underline"
                      >
                        Confirm this destination
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Origin City Autocomplete */}
            <div className="relative" ref={originRef}>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                <span>Origin City</span>
                <span className="text-[9px] text-stone-500 font-bold lowercase">Type-ahead suggest</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={originSearch}
                  onFocus={() => setShowOriginDropdown(true)}
                  onChange={(e) => {
                    setOriginSearch(e.target.value);
                    setShowOriginDropdown(true);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
                  placeholder="Search origin city (e.g. Mumbai, Delhi)..."
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              {/* Origin Floating Suggestions Dropdown */}
              {showOriginDropdown && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-stone-200 max-h-48 overflow-y-auto py-1 text-xs">
                  {filteredOriginCities.length > 0 ? (
                    filteredOriginCities.map(city => (
                      <button
                        type="button"
                        key={city}
                        onClick={() => {
                          setOriginSearch(city);
                          setShowOriginDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-orange-50/80 transition-colors flex items-center justify-between cursor-pointer border-b border-stone-100 last:border-0"
                      >
                        <span className="font-semibold text-stone-800">{city}</span>
                        {originSearch === city && (
                          <Check className="w-3.5 h-3.5 text-orange-600" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-2.5 text-stone-500 text-center text-[11px]">
                      Press confirm to use &quot;<span className="font-bold text-stone-800">{originSearch}</span>&quot;
                      <button
                        type="button"
                        onClick={() => setShowOriginDropdown(false)}
                        className="block mx-auto mt-1 text-orange-600 font-bold hover:underline"
                      >
                        Select origin
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Dual Date Pickers & Auto-Calculated Duration (Capped at 62 Days) */}
          <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-stone-700 font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Date Range & Duration (Max 62 Days)</span>
              </label>
              {typeof durationDays === 'number' && durationDays > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] font-mono">
                  {durationDays} {durationDays === 1 ? 'Day' : 'Days'} Calculated
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="block text-stone-500 text-[10px] font-semibold mb-1">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <span className="block text-stone-500 text-[10px] font-semibold mb-1">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <span className="block text-stone-500 text-[10px] font-semibold mb-1">Total Days (1-62)</span>
                <input
                  type="number"
                  min={1}
                  max={62}
                  value={durationDays}
                  onChange={(e) => handleDurationManualChange(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            {durationWarning && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{durationWarning}</span>
              </div>
            )}
          </div>

          {/* Real-time Indian Currency Budget & Traveler Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Real-time Indian Currency Formatted Budget */}
            <div>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                <span>Total Budget (₹ INR)</span>
                <span className="text-[9px] text-emerald-600 font-bold">Indian Currency Formatting</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={budgetDisplay}
                  onChange={handleBudgetChange}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-stone-50/50 font-mono"
                  placeholder="e.g. ₹1,50,000"
                />
                <IndianRupee className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Travelers Count */}
            <div>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1">
                Number of Travelers
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={travelerCount}
                  onChange={(e) => setTravelerCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
                  placeholder="e.g. 2"
                />
                <Users className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Type-Ahead Inputs: Companions & Planning Pace */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Companions Type-Ahead */}
            <div className="relative" ref={companionsRef}>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                <span>Companions / Travel Style</span>
                <span className="text-[9px] text-stone-500 font-bold lowercase">Type-ahead suggest</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={companionsInput}
                  onFocus={() => setShowCompanionsDropdown(true)}
                  onChange={(e) => {
                    setCompanionsInput(e.target.value);
                    setShowCompanionsDropdown(true);
                  }}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
                  placeholder="e.g. Couple, Family, Friends, Solo..."
                />
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              {showCompanionsDropdown && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-stone-200 max-h-48 overflow-y-auto py-1 text-xs">
                  {filteredCompanions.map(c => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => {
                        setCompanionsInput(c.label);
                        setShowCompanionsDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-rose-50/80 transition-colors flex items-center justify-between cursor-pointer border-b border-stone-100 last:border-0"
                    >
                      <div>
                        <span className="font-bold text-stone-800">{c.label}</span>
                        <p className="text-[10px] text-stone-500 leading-tight">{c.subtitle}</p>
                      </div>
                      {companionsInput.toLowerCase() === c.label.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Planning Pace Type-Ahead */}
            <div className="relative" ref={paceRef}>
              <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                <span>Planning Pace</span>
                <span className="text-[9px] text-stone-500 font-bold lowercase">Type-ahead suggest</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={paceInput}
                  onFocus={() => setShowPaceDropdown(true)}
                  onChange={(e) => {
                    setPaceInput(e.target.value);
                    setShowPaceDropdown(true);
                  }}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
                  placeholder="e.g. Balanced, Relaxed, Packed & Active..."
                />
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              {showPaceDropdown && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-stone-200 max-h-48 overflow-y-auto py-1 text-xs">
                  {filteredPace.map(p => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => {
                        setPaceInput(p.label);
                        setShowPaceDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-orange-50/80 transition-colors flex items-center justify-between cursor-pointer border-b border-stone-100 last:border-0"
                    >
                      <div>
                        <span className="font-bold text-stone-800">{p.label}</span>
                        <p className="text-[10px] text-stone-500 leading-tight">{p.subtitle}</p>
                      </div>
                      {paceInput.toLowerCase() === p.label.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-orange-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Budget Tier Selector */}
          <div>
            <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1.5">
              Budget Tier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'budget', label: 'Budget' },
                { id: 'moderate', label: 'Moderate' },
                { id: 'luxury', label: 'Luxury' },
                { id: 'ultra_luxury', label: 'Ultra Luxury' }
              ].map(tier => (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => setBudgetTier(tier.id)}
                  className={`p-2.5 rounded-2xl border text-center font-bold text-xs capitalize transition-all cursor-pointer ${
                    budgetTier === tier.id
                      ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-sm'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Interests (Updated in real-time based on selected Destination) */}
          <div className="bg-stone-50/60 p-3.5 rounded-2xl border border-stone-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-stone-700 font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-500" />
                <span>Dynamic Interests for {destinationSearch ? destinationSearch : 'Your Destination'}</span>
              </label>
              <span className="text-[10px] text-stone-500 font-semibold">
                {selectedInterests.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {dynamicAvailableInterests.map(interest => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => handleToggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-bold capitalize transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Requests / Notes */}
          <div>
            <label className="block text-stone-700 font-extrabold uppercase tracking-wider text-[10px] mb-1">
              Special Requests / Dietary / Preferences
            </label>
            <input
              type="text"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Vegetarian meals, mountain view rooms, sunrise photography stops..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-stone-50/50"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !destinationSearch.trim()}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold shadow-md shadow-rose-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Synthesizing Itinerary...' 
                  : editingTrip 
                    ? 'Save Changes' 
                    : 'Generate Itinerary with WanderFlow AI'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
