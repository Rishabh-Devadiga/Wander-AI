// Time Parsing, Clash Detection & Free Time Slot Analysis Utilities for TourFlow AI

export interface ParsedTimeSlot {
  startMinutes: number; // minutes from 00:00 (0 - 1440)
  endMinutes: number;   // minutes from 00:00 (0 - 1440)
  rawStart: string;
  rawEnd: string;
  itemId?: string;
  title?: string;
}

export interface FreeTimeSlot {
  startMinutes: number;
  endMinutes: number;
  startFormatted: string;
  endFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
}

export interface TimeClashResult {
  hasClash: boolean;
  clashingItem?: {
    id?: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  reason?: string;
}

/**
 * Parses time string like "10:00 AM", "10:30am", "14:00", "4:15 PM" into minutes from midnight (0 - 1440).
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim().toLowerCase();
  if (!clean) return null;

  // 1. Check for 12-hour format: "10:00 AM", "10:00am", "10 AM", "10am", "09:30 pm"
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const meridiem = match12[3].toLowerCase();

    if (hours === 12) {
      hours = meridiem === 'am' ? 0 : 12;
    } else if (meridiem === 'pm') {
      hours += 12;
    }

    if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // 2. Check for 24-hour format: "14:30", "09:00", "9:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // 3. Fallback: single number like "10", "14"
  const matchSingle = clean.match(/^(\d{1,2})$/);
  if (matchSingle) {
    const num = parseInt(matchSingle[1], 10);
    if (num >= 0 && num <= 23) {
      // Default to AM for 7-11, PM for 1-6 unless >= 12
      let h = num;
      if (h >= 1 && h <= 6) h += 12;
      return h * 60;
    }
  }

  return null;
}

/**
 * Formats minutes from midnight back to 12-hour time string e.g. "10:00 AM", "03:30 PM".
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const norm = Math.max(0, Math.min(1440, totalMinutes));
  let hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const meridiem = hours >= 12 && hours < 24 ? 'PM' : 'AM';

  if (hours === 0 || hours === 24) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  const minStr = String(minutes).padStart(2, '0');
  const hrStr = String(hours).padStart(2, '0');
  return `${hrStr}:${minStr} ${meridiem}`;
}

/**
 * Checks if two time ranges [start1, end1] and [start2, end2] overlap.
 */
export function doTimesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Fix overnight end time if needed (e.g. 11 PM to 1 AM)
  const e1 = end1 <= start1 ? end1 + 1440 : end1;
  const e2 = end2 <= start2 ? end2 + 1440 : end2;
  return Math.max(start1, start2) < Math.min(e1, e2);
}

/**
 * Extracts and parses all existing active activity slots for a specific day.
 */
export function getDayActiveTimeSlots(
  itinerary: any[],
  dayNumber: number,
  excludeItemId?: string
): ParsedTimeSlot[] {
  if (!Array.isArray(itinerary)) return [];

  const dayItems = itinerary.filter(
    (item) =>
      Number(item.day_number) === Number(dayNumber) &&
      !item.is_disabled &&
      (!excludeItemId || item.id !== excludeItemId)
  );

  const slots: ParsedTimeSlot[] = [];

  for (const item of dayItems) {
    const sMin = parseTimeToMinutes(item.start_time);
    const eMin = parseTimeToMinutes(item.end_time);

    if (sMin !== null && eMin !== null) {
      slots.push({
        startMinutes: sMin,
        endMinutes: eMin <= sMin ? eMin + 120 : eMin,
        rawStart: item.start_time,
        rawEnd: item.end_time,
        itemId: item.id,
        title: item.title,
      });
    }
  }

  // Sort chronologically by start time
  return slots.sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Validates a proposed activity time slot against existing day activities and destination arrival time.
 */
export function validateActivityTimeSlot(
  startTimeStr: string,
  endTimeStr: string,
  existingSlots: ParsedTimeSlot[],
  minAllowedStartMinutes?: number | null
): TimeClashResult {
  const startMin = parseTimeToMinutes(startTimeStr);
  const endMin = parseTimeToMinutes(endTimeStr);

  if (startMin === null || endMin === null) {
    return {
      hasClash: true,
      reason: 'Invalid time format. Please use standard times like "10:00 AM" or "02:30 PM".',
    };
  }

  if (endMin <= startMin) {
    return {
      hasClash: true,
      reason: 'End time must be after start time.',
    };
  }

  // Strict check: Cannot schedule activities before reaching destination on arrival day
  if (minAllowedStartMinutes !== undefined && minAllowedStartMinutes !== null && startMin < minAllowedStartMinutes) {
    return {
      hasClash: true,
      reason: `Cannot schedule activities before reaching destination (Arrival & check-in scheduled until ${formatMinutesToTime(minAllowedStartMinutes)}). Activities can only be scheduled after reaching the destination.`,
    };
  }

  const durationMin = endMin - startMin;
  if (durationMin < 15) {
    return {
      hasClash: true,
      reason: 'Activity duration must be at least 15 minutes.',
    };
  }

  if (durationMin > 600) {
    return {
      hasClash: true,
      reason: 'Activity duration cannot exceed 10 hours in a single session.',
    };
  }

  for (const slot of existingSlots) {
    if (doTimesOverlap(startMin, endMin, slot.startMinutes, slot.endMinutes)) {
      return {
        hasClash: true,
        clashingItem: {
          id: slot.itemId,
          title: slot.title || 'Scheduled Activity',
          start_time: slot.rawStart,
          end_time: slot.rawEnd,
        },
        reason: `Time clash detected with "${slot.title || 'existing activity'}" (${slot.rawStart} – ${slot.rawEnd}). Please pick an open time slot.`,
      };
    }
  }

  return {
    hasClash: false,
  };
}

/**
 * Computes all available, non-overlapping free time windows for a day between dayStartMinutes and dayEndMinutes.
 * On arrival day (Day 1), dayStartMinutes should be the destination arrival/check-in time.
 */
export function getAvailableTimeSlots(
  existingSlots: ParsedTimeSlot[],
  dayStartMinutes = 360, // 06:00 AM
  dayEndMinutes = 1350   // 10:30 PM
): FreeTimeSlot[] {
  // Sort existing slots by start time
  const sorted = [...existingSlots].sort((a, b) => a.startMinutes - b.startMinutes);
  const freeSlots: FreeTimeSlot[] = [];

  let currentPointer = dayStartMinutes;

  for (const slot of sorted) {
    // If the slot is earlier than the day's arrival window, advance pointer past it
    if (slot.endMinutes <= dayStartMinutes) {
      continue;
    }

    // Only consider activities within the valid window
    const actStart = Math.max(dayStartMinutes, slot.startMinutes);
    const actEnd = Math.min(dayEndMinutes, slot.endMinutes);

    if (actStart > currentPointer) {
      const gap = actStart - currentPointer;
      if (gap >= 30) {
        // Only keep gaps of at least 30 minutes
        const durHours = Math.floor(gap / 60);
        const durMins = gap % 60;
        let durFormatted = '';
        if (durHours > 0 && durMins > 0) durFormatted = `${durHours}h ${durMins}m free`;
        else if (durHours > 0) durFormatted = `${durHours} hr${durHours > 1 ? 's' : ''} free`;
        else durFormatted = `${durMins} mins free`;

        freeSlots.push({
          startMinutes: currentPointer,
          endMinutes: actStart,
          startFormatted: formatMinutesToTime(currentPointer),
          endFormatted: formatMinutesToTime(actStart),
          durationMinutes: gap,
          durationFormatted: durFormatted,
        });
      }
    }
    currentPointer = Math.max(currentPointer, actEnd);
  }

  // Check remaining window at the end of the day
  if (currentPointer < dayEndMinutes) {
    const gap = dayEndMinutes - currentPointer;
    if (gap >= 30) {
      const durHours = Math.floor(gap / 60);
      const durMins = gap % 60;
      let durFormatted = '';
      if (durHours > 0 && durMins > 0) durFormatted = `${durHours}h ${durMins}m free`;
      else if (durHours > 0) durFormatted = `${durHours} hr${durHours > 1 ? 's' : ''} free`;
      else durFormatted = `${durMins} mins free`;

      freeSlots.push({
        startMinutes: currentPointer,
        endMinutes: dayEndMinutes,
        startFormatted: formatMinutesToTime(currentPointer),
        endFormatted: formatMinutesToTime(dayEndMinutes),
        durationMinutes: gap,
        durationFormatted: durFormatted,
      });
    }
  }

  return freeSlots;
}

/**
 * Recommends the optimal initial time slot for a new activity of given duration (default 90 mins).
 */
export function getRecommendedTimeSlot(
  existingSlots: ParsedTimeSlot[],
  durationMinutes = 90,
  dayStartMinutes = 360,
  dayEndMinutes = 1350
): { start: string; end: string } | null {
  const freeSlots = getAvailableTimeSlots(existingSlots, dayStartMinutes, dayEndMinutes);
  if (freeSlots.length === 0) return null;

  // Find the best fitting slot
  const matchingSlot = freeSlots.find((s) => s.durationMinutes >= durationMinutes) || freeSlots[0];
  if (!matchingSlot) return null;

  const startMin = matchingSlot.startMinutes;
  const endMin = Math.min(matchingSlot.endMinutes, startMin + durationMinutes);

  return {
    start: formatMinutesToTime(startMin),
    end: formatMinutesToTime(endMin),
  };
}
