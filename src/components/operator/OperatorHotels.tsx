import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Star,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  Plus,
  Pencil,
  Eye,
  X,
} from 'lucide-react';
import { Trip, AccommodationAssignment, AccommodationStatus, OpsProperty } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';
import { hotelRowView, hotelAssignPrefill } from '../../utils/opsViewModels';

interface OperatorHotelsProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  focusTripId?: string | null;
  onClearFocus?: () => void;
}

type View = 'assignments' | 'properties';

const STATUS_STYLES: Record<AccommodationStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  assigned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  issue: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function nightsBetween(checkIn?: string | null, checkOut?: string | null, fallback?: number): number | null {
  if (checkIn && checkOut) {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (Number.isFinite(ms) && ms >= 0) return Math.max(1, Math.round(ms / 86400000));
    return null;
  }
  return fallback ?? null;
}

export const OperatorHotels: React.FC<OperatorHotelsProps> = ({ trips, onSelectTrip, focusTripId, onClearFocus }) => {
  const [view, setView] = useState<View>('assignments');
  const [assignments, setAssignments] = useState<AccommodationAssignment[]>([]);
  const [properties, setProperties] = useState<OpsProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccommodationStatus>('all');
  const [sortKey, setSortKey] = useState<'updated' | 'trip' | 'hotel'>('updated');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [propertyTrips, setPropertyTrips] = useState<Record<string, AccommodationAssignment[]>>({});
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dialog, setDialog] = useState<null | {
    mode: 'assign' | 'change' | 'rooms' | 'issue';
    tripId: string;
  }>(null);
  const [formHotelId, setFormHotelId] = useState('');
  const [formRooms, setFormRooms] = useState('');
  const [formRoomType, setFormRoomType] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formReason, setFormReason] = useState('');
  const [prefillHint, setPrefillHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [assignList, propList] = await Promise.all([
        TourFlowApi.getAccommodationAssignments(),
        TourFlowApi.getProperties(),
      ]);
      setAssignments(assignList);
      setProperties(propList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load accommodation operations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(true), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  const assignmentByTrip = useMemo(() => {
    const map = new Map<string, AccommodationAssignment>();
    assignments.forEach((a) => map.set(a.trip_id, a));
    return map;
  }, [assignments]);

  const rows = useMemo(() => {
    return trips.map((trip) => ({
      trip,
      assignment: assignmentByTrip.get(trip.id) || null,
      status: (assignmentByTrip.get(trip.id)?.status || 'pending') as AccommodationStatus,
    }));
  }, [trips, assignmentByTrip]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (focusTripId && r.trip.id !== focusTripId) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!q) return true;
        return (
          r.trip.id.toLowerCase().includes(q) ||
          (r.trip.title || '').toLowerCase().includes(q) ||
          (r.assignment?.hotel?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortKey === 'trip') return a.trip.id.localeCompare(b.trip.id);
        if (sortKey === 'hotel') {
          return (a.assignment?.hotel?.name || '').localeCompare(b.assignment?.hotel?.name || '');
        }
        return (b.assignment?.updated_at || '').localeCompare(a.assignment?.updated_at || '');
      });
  }, [rows, searchQuery, statusFilter, sortKey, focusTripId]);

  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return properties.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.destination_name || '').toLowerCase().includes(q)
      );
    });
  }, [properties, searchQuery]);

  const openDialog = (mode: 'assign' | 'change' | 'rooms' | 'issue', tripId: string) => {
    // Prefill from the existing assignment, else from the traveler pick, so
    // Accept is one review + Save. Everything stays editable.
    const existing = assignmentByTrip.get(tripId);
    const trip = trips.find((t) => t.id === tripId);
    const prefill = hotelAssignPrefill(
      {
        traveler_count: trip?.traveler_count,
        start_date: trip?.start_date,
        end_date: trip?.end_date,
        selected_accommodation: trip?.selected_accommodation,
        duration_days: trip?.duration_days,
      } as any,
      properties,
      existing || null,
    );
    setFormHotelId(prefill.hotelId);
    setFormRooms(prefill.rooms);
    setFormRoomType(prefill.roomType);
    setFormCheckIn(prefill.checkIn);
    setFormCheckOut(prefill.checkOut);
    setPrefillHint(mode === 'assign' || mode === 'change' ? prefill.hint : null);
    setFormReason('');
    setDialog({ mode, tripId });
  };

  const submitDialog = async () => {
    if (!dialog) return;
    setSubmitting(true);
    try {
      const rooms = formRooms.trim() === '' ? null : Number(formRooms);
      if (formRooms.trim() !== '' && (!Number.isInteger(rooms) || (rooms as number) < 0)) {
        throw new Error('Room count must be a non-negative whole number.');
      }
      if (dialog.mode === 'assign') {
        await TourFlowApi.assignAccommodation({
          trip_id: dialog.tripId,
          hotel_id: formHotelId || null,
          rooms,
          room_type: formRoomType.trim() || null,
          check_in_date: formCheckIn || null,
          check_out_date: formCheckOut || null,
        });
        showToast('ok', `Accommodation assigned to ${dialog.tripId}.`);
      } else if (dialog.mode === 'change') {
        await TourFlowApi.changeAccommodationAssignment(dialog.tripId, {
          hotel_id: formHotelId || null,
          rooms,
          room_type: formRoomType.trim() || null,
          check_in_date: formCheckIn || null,
          check_out_date: formCheckOut || null,
        });
        showToast('ok', `Accommodation updated for ${dialog.tripId}.`);
      } else if (dialog.mode === 'rooms') {
        await TourFlowApi.updateRoomAllocation(dialog.tripId, {
          rooms,
          room_type: formRoomType.trim() || null,
        });
        showToast('ok', `Room allocation updated for ${dialog.tripId}.`);
      } else {
        if (!formReason.trim()) throw new Error('A reason is required to flag an issue.');
        if (!window.confirm(`Flag accommodation for ${dialog.tripId} as an issue?`)) return;
        await TourFlowApi.flagAccommodationIssue(dialog.tripId, formReason.trim());
        showToast('ok', `Issue flagged for ${dialog.tripId}.`);
      }
      setDialog(null);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (tripId: string) => {
    try {
      await TourFlowApi.resolveAccommodationIssue(tripId);
      showToast('ok', `Issue resolved for ${tripId}.`);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Resolve failed.');
    }
  };

  const toggleProperty = async (hotelId: string) => {
    if (expandedProperty === hotelId) {
      setExpandedProperty(null);
      return;
    }
    setExpandedProperty(hotelId);
    if (!propertyTrips[hotelId]) {
      try {
        const detail = await TourFlowApi.getPropertyTrips(hotelId);
        setPropertyTrips((prev) => ({ ...prev, [hotelId]: detail.assignments }));
      } catch (err: any) {
        showToast('err', err?.message || 'Failed to load property trips.');
      }
    }
  };

  const renderManifest = (trip: Trip) => (
    <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
      <div className="font-bold text-slate-200 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-sky-400" />
        <span>Guest Manifest — traveler party of {trip.traveler_count}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
        <div>Companions: <strong className="text-slate-200">{trip.preferences?.travel_companions || '—'}</strong></div>
        <div>Dates: <strong className="text-slate-200">{trip.start_date?.slice(0, 10) || '?'} → {trip.end_date?.slice(0, 10) || '?'}</strong></div>
        <div>Dietary: <strong className="text-slate-200">{(trip.preferences?.dietary_requirements || []).join(', ') || '—'}</strong></div>
        <div>Requests: <strong className="text-slate-200">{trip.preferences?.special_requests || '—'}</strong></div>
      </div>
      <div>
        <div className="text-slate-500 uppercase text-[10px] font-bold mb-1">Bookings ({trip.bookings?.length || 0})</div>
        {(trip.bookings || []).length === 0 ? (
          <div className="text-slate-500">No bookings recorded for this trip.</div>
        ) : (
          <div className="space-y-1">
            {trip.bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap gap-x-3 font-mono text-[11px] text-slate-300">
                <span>{b.booking_reference}</span>
                <span>{b.item_type}</span>
                <span>₹{b.amount.toLocaleString()}</span>
                <span>{b.status}/{b.payment_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Hotels & Resorts Operations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              TRIP → RESOURCE → STATUS → ACTION
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Live accommodation assignments persisted in the operations database. Auto-refreshes every 30s.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${toast.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {toast.text}
        </div>
      )}
      {focusTripId && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-between gap-2">
          <span>Assigning services for trip <span className="font-mono">{focusTripId}</span> — list filtered to this trip.</span>
          {onClearFocus && (
            <button onClick={onClearFocus} className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]">Show all</button>
          )}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <strong>Operations backend unreachable:</strong> {error} Start FastAPI with <code>python -m uvicorn backend.main:app --port 8000</code>.
        </div>
      )}

      <div className="flex items-center gap-2">
        {(['assignments', 'properties'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${view === v ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            {v === 'assignments' ? `Trip Assignments (${rows.length})` : `Properties (${properties.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={view === 'assignments' ? 'Search trip ID, title, or hotel...' : 'Search property, address, destination...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        {view === 'assignments' && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AccommodationStatus)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="issue">Issue</option>
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'updated' | 'trip' | 'hotel')}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="updated">Sort: recently updated</option>
              <option value="trip">Sort: trip ID</option>
              <option value="hotel">Sort: hotel</option>
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading operations data...</div>
      ) : view === 'assignments' ? (
        filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="font-bold text-white text-sm">No Trip Assignments</div>
            <p className="text-xs mt-1">No trips match the current search or status filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ trip, assignment, status }) => {
              const nights = nightsBetween(assignment?.check_in_date, assignment?.check_out_date, Math.max(1, (trip.duration_days || 2) - 1));
              const nightly = assignment?.hotel?.price_per_night || 0;
              // Traveler selection vs operational assignment (same trip record).
              const rowView = hotelRowView(trip, assignment);
              return (
                <div key={trip.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-sky-400 truncate">{trip.id}</span>
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">{trip.title}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!assignment ? (
                        <button onClick={() => openDialog('assign', trip.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Assign Hotel
                        </button>
                      ) : (
                        <>
                          <button onClick={() => openDialog('change', trip.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Change
                          </button>
                          <button onClick={() => openDialog('rooms', trip.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
                            <BedDouble className="w-3 h-3" /> Rooms
                          </button>
                          {status === 'issue' ? (
                            <button onClick={() => handleResolve(trip.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resolve
                            </button>
                          ) : (
                            <button onClick={() => openDialog('issue', trip.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Flag Issue
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Manifest
                      </button>
                      <button onClick={() => onSelectTrip(trip.id)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold">
                        Open →
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Property</div>
                      <div className="text-slate-200 font-semibold truncate">
                        {rowView.propertyName || 'No traveler selection'}
                      </div>
                      {rowView.propertySource === 'assigned' && assignment?.hotel?.address && (
                        <div className="text-slate-500 truncate text-[11px]">{assignment.hotel.address}</div>
                      )}
                      <div className="text-[11px] mt-1 space-y-0.5">
                        <div className={rowView.travelerHotelName ? 'text-sky-300/90' : 'text-slate-500'}>
                          {rowView.travelerHotelName
                            ? `Traveler selection: ✓ ${rowView.travelerHotelName}${rowView.travelerHotelPricePerNight != null ? ` (₹${rowView.travelerHotelPricePerNight.toLocaleString()}/night)` : ''}`
                            : 'Traveler selection: —'}
                        </div>
                        <div className={status === 'assigned' ? 'text-emerald-300/90' : 'text-amber-300/90'}>
                          {status === 'assigned'
                            ? 'Operator assignment: ✓ Assigned'
                            : status === 'issue'
                              ? 'Operator assignment: ⚠ Issue'
                              : 'Operator assignment: ⚠ Pending'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Rooms</div>
                      <div className="text-slate-200 font-semibold">
                        {assignment?.rooms != null ? `${assignment.rooms} × ${assignment.room_type || 'standard'}` : '—'}
                      </div>
                      <div className="text-slate-500 text-[11px]">{assignment?.check_in_date || '?'} → {assignment?.check_out_date || '?'}</div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Price</div>
                      <div className="text-emerald-400 font-bold font-mono">
                        {nightly > 0 && nights ? `₹${(nightly * nights).toLocaleString()}` : '—'}
                      </div>
                      <div className="text-slate-500 text-[11px]">{nightly > 0 ? `₹${nightly.toLocaleString()}/night × ${nights ?? '?'}n` : 'no rate'}</div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Attention</div>
                      <div className="text-slate-200 font-semibold text-[11px] leading-snug">
                        {status === 'pending' && (rowView.travelerHotelName ? 'Assign inventory property for traveler pick.' : 'No traveler pick; assign from inventory.')}
                        {status === 'assigned' && 'Operational. Monitor dates and rooms.'}
                        {status === 'issue' && (assignment?.issue_reason || 'Needs attention.')}
                      </div>
                    </div>
                  </div>

                  {expandedTrip === trip.id && renderManifest(trip)}
                </div>
              );
            })}
          </div>
        )
      ) : filteredProperties.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Properties Found</div>
          <p className="text-xs mt-1">No inventory properties match the current search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProperties.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">{p.category}</span>
                  <h3 className="text-base font-bold text-white mt-1.5">{p.name}</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.address || p.destination_name || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /><span>{p.rating}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Trips using this property: <strong className="text-white font-mono">{p.assigned_trip_count}</strong></span>
                <span className="font-mono text-emerald-400 font-bold">₹{p.price_per_night.toLocaleString()}/night</span>
              </div>
              <button
                onClick={() => toggleProperty(p.id)}
                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
              >
                {expandedProperty === p.id ? 'Hide assigned trips' : `View assigned trips (${p.assigned_trip_count})`}
              </button>
              {expandedProperty === p.id && (
                <div className="space-y-1.5">
                  {(propertyTrips[p.id] || []).length === 0 ? (
                    <div className="text-xs text-slate-500">No trips currently assigned to this property.</div>
                  ) : (
                    (propertyTrips[p.id] || []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <span className="font-mono text-sky-400 truncate">{a.trip_id}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                        <button onClick={() => onSelectTrip(a.trip_id)} className="text-slate-400 hover:text-white font-semibold">Open →</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {dialog.mode === 'assign' && `Assign Hotel — ${dialog.tripId}`}
                {dialog.mode === 'change' && `Change Hotel — ${dialog.tripId}`}
                {dialog.mode === 'rooms' && `Room Allocation — ${dialog.tripId}`}
                {dialog.mode === 'issue' && `Flag Issue — ${dialog.tripId}`}
              </h3>
              <button onClick={() => setDialog(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {(dialog.mode === 'assign' || dialog.mode === 'change') && (
              <>
                <label className="block text-xs text-slate-400 font-bold uppercase">Property (live inventory)</label>
                {prefillHint && (
                  <p className="text-[11px] text-sky-300/90 bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2">{prefillHint}</p>
                )}
                <select value={formHotelId} onChange={(e) => setFormHotelId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="">— No property (pending) —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.destination_name || ''} (₹{p.price_per_night.toLocaleString()}/night)</option>
                  ))}
                </select>
              </>
            )}

            {(dialog.mode === 'assign' || dialog.mode === 'change' || dialog.mode === 'rooms') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Rooms</label>
                  <input type="number" min={0} value={formRooms} onChange={(e) => setFormRooms(e.target.value)} placeholder="e.g. 2" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Room type</label>
                  <input type="text" value={formRoomType} onChange={(e) => setFormRoomType(e.target.value)} placeholder="e.g. Deluxe Suite" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                {(dialog.mode === 'assign' || dialog.mode === 'change') && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Check-in</label>
                      <input type="date" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Check-out</label>
                      <input type="date" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    </div>
                  </>
                )}
              </div>
            )}

            {dialog.mode === 'issue' && (
              <>
                <label className="block text-xs text-slate-400 font-bold uppercase">Issue reason</label>
                <textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={3} placeholder="e.g. Property overbooked for these dates" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitDialog} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : dialog.mode === 'issue' ? 'Flag Issue' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Auto-refresh 30s</span>
        <span>Statuses derive from backend assignment data: no hotel → pending, hotel + rooms → assigned, conflict/missing info → issue.</span>
      </div>
    </div>
  );
};
