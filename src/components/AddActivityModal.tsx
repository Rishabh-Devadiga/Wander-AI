import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Compass,
  Calendar,
} from 'lucide-react';
import { Trip, ItineraryItem } from '../types/tourflow';
import {
  getDayActiveTimeSlots,
  getAvailableTimeSlots,
  validateActivityTimeSlot,
  formatMinutesToTime,
  parseTimeToMinutes,
} from '../utils/timeValidation';
import {
  searchLocationsForDestination,
  generateAutoDescriptionForLocation,
  LocationSpot,
} from '../data/locationCatalog';

interface AddActivityModalProps {
  dayNumber: number;
  trip: Trip;
  onClose: () => void;
  onSubmit: (
    dayNumber: number,
    activity: {
      title: string;
      start_time: string;
      end_time: string;
      cost: number;
      description?: string;
      location?: string;
    }
  ) => void;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  dayNumber,
  trip,
  onClose,
  onSubmit,
}) => {
  const destName = trip.destination?.name || '';

  // Destination arrival time calculation for Day 1 (to ensure no activities before reaching destination)
  const day1ArrivalMinutes = useMemo(() => {
    if (dayNumber !== 1) return 360; // 06:00 AM on subsequent days
    const day1Items = (trip.itinerary || []).filter((i) => i.day_number === 1 && !i.is_disabled);

    // Check-in item end time
    const checkInItem = day1Items.find((i) => i.item_type === 'hotel' && i.title.toLowerCase().includes('check-in'));
    if (checkInItem?.end_time) {
      const parsed = parseTimeToMinutes(checkInItem.end_time);
      if (parsed) return parsed;
    }
    if (checkInItem?.start_time) {
      const parsed = parseTimeToMinutes(checkInItem.start_time);
      if (parsed) return Math.min(1320, parsed + 45);
    }
    // Transfer arrival at destination
    if (trip.selected_transport?.dependent_transfer?.arrival_at_destination) {
      const parsed = parseTimeToMinutes(trip.selected_transport.dependent_transfer.arrival_at_destination);
      if (parsed) return Math.min(1320, parsed + 45); // +45 mins for transit & check-in
    }
    // Any transport items on Day 1
    const transportItems = day1Items.filter((i) => i.item_type === 'transport');
    if (transportItems.length > 0) {
      const lastTransport = transportItems[transportItems.length - 1];
      const parsed = parseTimeToMinutes(lastTransport.end_time);
      if (parsed) return Math.min(1320, parsed + 45);
    }
    return 990; // 04:30 PM default fallback on Day 1
  }, [dayNumber, trip.itinerary, trip.selected_transport]);

  const minAllowedStartMinutes = dayNumber === 1 ? day1ArrivalMinutes : 360;

  // Get existing active time slots for this day
  const existingDaySlots = useMemo(() => {
    return getDayActiveTimeSlots(trip.itinerary || [], dayNumber);
  }, [trip.itinerary, dayNumber]);

  // Compute open free slots (strictly after arrival on Day 1)
  const availableSlots = useMemo(() => {
    return getAvailableTimeSlots(existingDaySlots, minAllowedStartMinutes, 1350);
  }, [existingDaySlots, minAllowedStartMinutes]);

  const isDayCompletelyFull = availableSlots.length === 0 && existingDaySlots.length > 0;

  // Initial recommended time slot
  const initialTimes = useMemo(() => {
    if (availableSlots.length > 0) {
      const best = availableSlots.find((s) => s.durationMinutes >= 90) || availableSlots[0];
      const startMin = best.startMinutes;
      const endMin = Math.min(best.endMinutes, startMin + 90);
      return {
        start: formatMinutesToTime(startMin),
        end: formatMinutesToTime(endMin),
      };
    }
    const defaultStart = minAllowedStartMinutes >= 960 ? minAllowedStartMinutes : 600;
    return {
      start: formatMinutesToTime(defaultStart),
      end: formatMinutesToTime(Math.min(1320, defaultStart + 90)),
    };
  }, [availableSlots, minAllowedStartMinutes]);

  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<LocationSpot | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(initialTimes.start);
  const [endTime, setEndTime] = useState(initialTimes.end);
  const [cost, setCost] = useState<number>(0);
  const [locationName, setLocationName] = useState(destName || 'Local Area');
  const [description, setDescription] = useState('');
  const [showAllSpots, setShowAllSpots] = useState(false);

  // Search filtered spots
  const matchingSpots = useMemo(() => {
    return searchLocationsForDestination(destName, locationQuery);
  }, [destName, locationQuery]);

  // Pre-select first spot if user hasn't selected anything yet
  useEffect(() => {
    if (matchingSpots.length > 0 && !title) {
      const first = matchingSpots[0];
      setSelectedSpot(first);
      setTitle(first.name);
      setDescription(first.description + (first.tips ? ` Tip: ${first.tips}` : ''));
      setCost(first.cost);
      setLocationName(first.name);
    }
  }, [matchingSpots, title]);

  // Handle spot selection
  const handleSelectSpot = (spot: LocationSpot) => {
    setSelectedSpot(spot);
    setTitle(spot.name);
    setDescription(spot.description + (spot.tips ? ` Tip: ${spot.tips}` : ''));
    setCost(spot.cost);
    setLocationName(spot.name);

    // If current time clashes, pick the first available open slot
    if (availableSlots.length > 0) {
      const best = availableSlots.find((s) => s.durationMinutes >= spot.duration_minutes) || availableSlots[0];
      const sMin = best.startMinutes;
      const eMin = Math.min(best.endMinutes, sMin + (spot.duration_minutes || 90));
      setStartTime(formatMinutesToTime(sMin));
      setEndTime(formatMinutesToTime(eMin));
    }
  };

  // Handle custom location typing & auto-description generation
  const handleCustomLocationBlurOrEnter = (val: string) => {
    if (!val.trim()) return;
    const generated = generateAutoDescriptionForLocation(val, destName);
    setTitle(generated.title);
    setDescription(generated.description);
    setCost(generated.cost);
    setLocationName(val.trim());
  };

  // Time clash validation (including Day 1 arrival check)
  const timeClashValidation = useMemo(() => {
    return validateActivityTimeSlot(startTime, endTime, existingDaySlots, minAllowedStartMinutes);
  }, [startTime, endTime, existingDaySlots, minAllowedStartMinutes]);

  const canSubmit =
    title.trim().length > 0 &&
    !timeClashValidation.hasClash &&
    !isDayCompletelyFull;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit(dayNumber, {
      title: title.trim(),
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      cost: Number(cost) || 0,
      description: description.trim() || `Visit to ${title.trim()} in ${destName}.`,
      location: locationName.trim() || destName || 'Local Area',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B21B6] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Day {dayNumber} of {trip.duration_days}</span>
              </span>
              <span className="text-xs text-stone-500 font-semibold">
                • {destName || 'Trip Schedule'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-950 mt-1">
              Add Activity to Itinerary
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Select a popular location or search below. Description & details are generated automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Day Full Alert */}
          {isDayCompletelyFull && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Day {dayNumber} Schedule is Fully Booked
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  There are no free 30+ minute time slots left between 06:00 AM and 10:30 PM. Please remove or shorten an existing activity to make room.
                </p>
              </div>
            </div>
          )}

          {/* 1. Location Search & Auto-Description Picker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#7065F0]" />
                <span>Search Locations in {destName || 'Destination'}</span>
              </label>
              <span className="text-[11px] text-[#7065F0] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Auto-fills details</span>
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationQuery.trim()) {
                      handleCustomLocationBlurOrEnter(locationQuery.trim());
                    }
                  }
                }}
                placeholder={`Search sights, temples, viewpoints, beaches in ${destName || 'destination'}...`}
                className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
              />
              {locationQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleCustomLocationBlurOrEnter(locationQuery.trim())}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#7065F0] text-white text-[11px] font-bold hover:bg-[#5B21B6] transition-all cursor-pointer"
                >
                  Use Custom
                </button>
              )}
            </div>

            {/* Quick Location Recommendations Grid */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-500 block">
                Suggested spots for {destName || 'this destination'}:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-0.5">
                {(showAllSpots ? matchingSpots : matchingSpots.slice(0, 4)).map((spot) => {
                  const isSelected = title === spot.name;
                  return (
                    <button
                      key={spot.name}
                      type="button"
                      onClick={() => handleSelectSpot(spot)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#7065F0] bg-[#EDE9FE]/40 ring-2 ring-[#7065F0]/20'
                          : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-extrabold text-stone-950 line-clamp-1">
                          {spot.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold shrink-0">
                          {spot.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2 mt-1">
                        {spot.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 font-semibold mt-2 pt-1.5 border-t border-stone-100">
                        <span>⏳ ~{spot.duration_minutes} mins</span>
                        <span className="font-bold text-stone-900">
                          {spot.cost > 0 ? `₹${spot.cost.toLocaleString()}` : 'Free Entry'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {matchingSpots.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllSpots(!showAllSpots)}
                  className="text-xs font-bold text-[#7065F0] hover:underline cursor-pointer pt-0.5"
                >
                  {showAllSpots ? 'Show fewer spots' : `View all ${matchingSpots.length} spots`}
                </button>
              )}
            </div>
          </div>

          {/* 2. Time Slot Selector & Clash Prevention */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7065F0]" />
                <span>Time Slot (Clash Protected)</span>
              </label>
              {availableSlots.length > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {availableSlots.length} open slot{availableSlots.length > 1 ? 's' : ''} available
                </span>
              )}
            </div>

            {/* Available Free Time Slots Quick Chips */}
            {availableSlots.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-stone-600 font-medium">
                  Click to fill open time window:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const dur = selectedSpot?.duration_minutes || 90;
                        const sMin = slot.startMinutes;
                        const eMin = Math.min(slot.endMinutes, sMin + dur);
                        setStartTime(formatMinutesToTime(sMin));
                        setEndTime(formatMinutesToTime(eMin));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{slot.startFormatted} – {slot.endFormatted}</span>
                      <span className="text-[10px] text-emerald-700 font-normal">({slot.durationFormatted})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-semibold text-stone-900 focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">End Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="e.g. 12:00 PM"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-semibold text-stone-900 focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>
            </div>

            {/* Time Clash Error Banner */}
            {timeClashValidation.hasClash && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-950 font-bold">Time Conflict Detected</strong>
                  <span>{timeClashValidation.reason}</span>
                </div>
              </div>
            )}

            {/* Valid slot indicator */}
            {!timeClashValidation.hasClash && !isDayCompletelyFull && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valid slot: No clashes with other Day {dayNumber} activities</span>
              </div>
            )}

            {/* Existing Day Activities List */}
            {existingDaySlots.length > 0 && (
              <div className="pt-2 border-t border-stone-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Currently scheduled on Day {dayNumber}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {existingDaySlots.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-700 text-[11px] font-semibold"
                    >
                      {s.rawStart} – {s.rawEnd}: <strong>{s.title}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Activity Title, Cost, & Auto-Populated Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim().length > 3) {
                    const gen = generateAutoDescriptionForLocation(e.target.value, destName);
                    setDescription(gen.description);
                    setCost(gen.cost);
                  }
                }}
                required
                placeholder="e.g. Tiger Hill Sunrise & Kanchenjunga View"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-hidden focus:border-[#7065F0]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-stone-100/90 border border-stone-200/90 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-stone-500 block">
                  Estimated Cost
                </span>
                <span className="text-sm font-extrabold text-stone-950 mt-0.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{cost > 0 ? `₹${cost.toLocaleString()}` : 'Free Entry'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-stone-100/90 border border-stone-200/90 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-stone-500 block">
                  Location / Area
                </span>
                <span className="text-sm font-extrabold text-stone-950 mt-0.5 flex items-center gap-1 truncate" title={locationName || destName || 'Local Area'}>
                  <MapPin className="w-3.5 h-3.5 text-[#7065F0] shrink-0" />
                  <span className="truncate">{locationName || destName || 'Local Area'}</span>
                </span>
              </div>
            </div>

            {/* Day 1 Arrival Constraint Notice */}
            {dayNumber === 1 && minAllowedStartMinutes > 360 && (
              <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#7065F0] shrink-0" />
                <span>
                  <strong>Arrival constraint:</strong> Transit & check-in scheduled until <strong>{formatMinutesToTime(minAllowedStartMinutes)}</strong>. Activities can only be booked after reaching your destination.
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#7065F0]" />
                  <span>Activity Description & Itinerary Advice</span>
                </label>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  Auto-Curated
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-800 leading-relaxed min-h-[64px] flex items-start gap-2">
                <span className="text-stone-700 select-text">
                  {description.trim() || `Curated excursion to ${title.trim() || locationName || 'this destination attraction'} featuring authentic sightseeing and local experiences.`}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex-1 py-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                canSubmit
                  ? 'bg-stone-950 hover:bg-black text-white cursor-pointer shadow-sm active:scale-95'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Add to Day {dayNumber}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
