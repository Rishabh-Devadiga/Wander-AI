import type {
  AccommodationAssignment,
  ActivityAssignment,
  TransportAssignment,
  Trip,
} from '../types/tourflow';

/**
 * Operator view-models: Traveler Selection vs Operational Assignment.
 *
 * Every builder below is pure and copies only strings/numbers already present
 * in its inputs. Nothing is invented: when the traveler selected nothing, the
 * view says so; when operations assigned nothing, the view says Pending.
 * Both sides always key on the SAME trip id -- no duplicate records.
 */

export interface HotelRowView {
  tripId: string;
  /** Primary property display: assigned inventory property, else traveler pick, else null. */
  propertyName: string | null;
  propertySource: 'assigned' | 'traveler' | 'none';
  travelerHotelName: string | null;
  travelerHotelPricePerNight: number | null;
  opStatus: 'pending' | 'assigned' | 'issue';
}

export function hotelRowView(
  trip: Pick<Trip, 'id' | 'selected_accommodation'>,
  assignment: AccommodationAssignment | null,
): HotelRowView {
  const travelerHotelName =
    trip.selected_accommodation && trip.selected_accommodation.name
      ? trip.selected_accommodation.name
      : null;
  const travelerHotelPricePerNight =
    trip.selected_accommodation && typeof trip.selected_accommodation.price_per_night === 'number'
      ? trip.selected_accommodation.price_per_night
      : null;
  if (assignment && assignment.hotel) {
    return {
      tripId: trip.id,
      propertyName: assignment.hotel.name,
      propertySource: 'assigned',
      travelerHotelName,
      travelerHotelPricePerNight,
      opStatus: assignment.status,
    };
  }
  if (travelerHotelName) {
    return {
      tripId: trip.id,
      propertyName: travelerHotelName,
      propertySource: 'traveler',
      travelerHotelName,
      travelerHotelPricePerNight,
      opStatus: assignment ? assignment.status : 'pending',
    };
  }
  return {
    tripId: trip.id,
    propertyName: null,
    propertySource: 'none',
    travelerHotelName: null,
    travelerHotelPricePerNight: null,
    opStatus: assignment ? assignment.status : 'pending',
  };
}

export interface TransportRowView {
  tripId: string;
  travelerPickLabel: string | null;
  hasOperationalVehicle: boolean;
  opStatus: 'pending' | 'assigned' | 'en_route' | 'completed' | 'delayed';
}

export function transportRowView(
  trip: Pick<Trip, 'id' | 'selected_transport'>,
  assignment: TransportAssignment | null,
): TransportRowView {
  const t = trip.selected_transport;
  const travelerPickLabel = t ? `${t.operator} (${t.mode})` : null;
  return {
    tripId: trip.id,
    travelerPickLabel,
    hasOperationalVehicle: Boolean(assignment && assignment.vehicle),
    opStatus: assignment ? assignment.status : 'pending',
  };
}
export interface TravelerActivityRow {
  key: string;
  tripId: string;
  tripTitle: string;
  title: string;
  dayNumber: number;
  startTime?: string;
  endTime?: string;
  /** Traveler schedule resolved to calendar values (null when underivable). */
  scheduledDate: string | null;
  startTimeHHMM: string;
  endTimeHHMM: string;
  location?: string;
  participants: number;
  cost: number;
  /** Traveler picks are never operator-confirmed by themselves. */
  opStatus: 'pending';
}

/** "04:30 PM" / "9:00 AM" / "16:30" -> "HH:MM" (24h); "" when unparseable. */
export function toHHMM(value: unknown): string {
  if (typeof value !== 'string') return '';
  const m = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!m) return '';
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? '0');
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) return '';
  if (m[3]) {
    if (hour < 1 || hour > 12) return '';
    hour = (hour % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  } else if (hour > 23) {
    return '';
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Day N -> calendar date from the traveler's trip start ("" when unknown). */
export function travelerDayToDate(startDate: unknown, dayNumber: number): string {
  const base = typeof startDate === 'string' ? startDate.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return '';
  const day = Number(dayNumber) || 1;
  const d = new Date(`${base}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + (day - 1));
  return d.toISOString().slice(0, 10);
}

/** Traveler-selected itinerary activities as Pending reference rows (no backend rows). */
export function travelerActivityRows(
  trip: Pick<Trip, 'id' | 'title' | 'traveler_count' | 'itinerary' | 'start_date' | 'end_date'>,
): TravelerActivityRow[] {
  const tripStart = (trip as any).start_date;
  return (trip.itinerary || [])
    .filter((i: any) => ['activity', 'sightseeing', 'leisure'].includes(i?.item_type) && !i?.is_disabled)
    .map((i: any, idx: number) => {
      const dayNumber = Number(i.day_number) || 1;
      const date = travelerDayToDate(tripStart, dayNumber);
      return {
        key: `${trip.id}::traveler-activity::${i.id || idx}`,
        tripId: trip.id,
        tripTitle: (trip as any).title || trip.id,
        title: String(i.title || 'Untitled activity'),
        dayNumber,
        startTime: i.start_time,
        endTime: i.end_time,
        scheduledDate: date || null,
        startTimeHHMM: toHHMM(i.start_time),
        endTimeHHMM: toHHMM(i.end_time),
        location: i.location,
        participants: Math.max(1, Number((trip as any).traveler_count) || 1),
        cost: Number(i.cost) || 0,
        opStatus: 'pending' as const,
      };
    });
}

export interface HotelPrefill {
  hotelId: string;
  matched: boolean;
  rooms: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  hint: string | null;
}

/**
 * Prefill an Assign/Change Hotel form from the trip's traveler selection.
 * Property matches live inventory by name (exact, then contains-either-way);
 * rooms default to the app's own ceil(travelers/2) convention; dates and room
 * type copy the traveler pick. Everything stays editable — the operator
 * reviews before saving, and the backend revalidates on write.
 */
export function hotelAssignPrefill(
  trip: Pick<Trip, 'traveler_count' | 'start_date' | 'end_date' | 'selected_accommodation'> & { duration_days?: number },
  properties: Array<{ id: string; name: string }>,
  existing?: {
    hotel_id?: string | null;
    rooms?: number | null;
    room_type?: string | null;
    check_in_date?: string | null;
    check_out_date?: string | null;
  } | null,
): HotelPrefill {
  if (existing) {
    return {
      hotelId: existing.hotel_id || '',
      rooms: existing.rooms != null ? String(existing.rooms) : '',
      roomType: existing.room_type || '',
      checkIn: existing.check_in_date || '',
      checkOut: existing.check_out_date || '',
      matched: true,
      hint: null,
    };
  }
  const pick: any = (trip as any).selected_accommodation || null;
  const pickName = pick && typeof pick.name === 'string' ? pick.name.trim() : '';
  let hotelId = '';
  let matched = false;
  if (pickName) {
    const lower = pickName.toLowerCase();
    const exact = properties.find((p) => p.name.toLowerCase() === lower);
    const fuzzy =
      exact || properties.find((p) => lower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lower));
    if (fuzzy) {
      hotelId = fuzzy.id;
      matched = true;
    }
  }
  const travelers = Math.max(1, Number((trip as any).traveler_count) || 1);
  return {
    hotelId,
    rooms: String(Math.ceil(travelers / 2)),
    roomType: (pick && typeof pick.room_type === 'string' ? pick.room_type : '') || '',
    checkIn: String((trip as any).start_date || '').slice(0, 10),
    checkOut: String((trip as any).end_date || '').slice(0, 10),
    matched,
    hint: pickName
      ? matched
        ? `Prefilled from traveler pick: ${pickName} — review before saving.`
        : `Traveler pick "${pickName}" has no exact inventory match — select the closest property.`
      : null,
  };
}
