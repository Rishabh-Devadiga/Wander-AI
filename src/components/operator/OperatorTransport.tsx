import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Car,
  Search,
  MapPin,
  Clock,
  RefreshCw,
  Plus,
  Pencil,
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Play,
  Flag,
  Users,
} from 'lucide-react';
import { Trip, TransportAssignment, TransportStatus, Vehicle, Driver } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';
import { transportRowView } from '../../utils/opsViewModels';

interface OperatorTransportProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  focusTripId?: string | null;
  onClearFocus?: () => void;
}

type View = 'dispatch' | 'fleet' | 'drivers';

const STATUS_STYLES: Record<TransportStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  assigned: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  en_route: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  delayed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const NEXT_ACTIONS: Record<TransportStatus, TransportStatus[]> = {
  pending: [],
  assigned: ['en_route', 'completed', 'delayed'],
  en_route: ['completed', 'delayed'],
  delayed: ['assigned', 'en_route'],
  completed: [],
};

const ACTION_LABELS: Record<string, string> = {
  en_route: 'Start Journey',
  completed: 'Complete',
  delayed: 'Mark Delayed',
  assigned: 'Resolve to Assigned',
};

const NOTIFY_EVENTS = [
  'vehicle_change',
  'driver_change',
  'timing_change',
  'route_change',
  'delay',
  'assignment',
] as const;

function fmtDT(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export const OperatorTransport: React.FC<OperatorTransportProps> = ({ trips, onSelectTrip, focusTripId, onClearFocus }) => {
  const [view, setView] = useState<View>('dispatch');
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TransportStatus>('all');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [assignDialog, setAssignDialog] = useState<{ tripId: string } | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ tripId: string; to: TransportStatus } | null>(null);
  const [notifyDialog, setNotifyDialog] = useState<{ tripId: string } | null>(null);
  const [fleetDialog, setFleetDialog] = useState<'vehicle' | 'driver' | null>(null);

  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formPickup, setFormPickup] = useState('');
  const [formDropoff, setFormDropoff] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formEvent, setFormEvent] = useState<string>('delay');
  const [formNote, setFormNote] = useState('');
  const [formName, setFormName] = useState('');
  const [formReg, setFormReg] = useState('');
  const [formType, setFormType] = useState('private_cab');
  const [formCapacity, setFormCapacity] = useState('4');
  const [formPhone, setFormPhone] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4500);
  };

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [assignList, vehList, drvList] = await Promise.all([
        TourFlowApi.getTransportAssignments(),
        TourFlowApi.getVehicles(),
        TourFlowApi.getDrivers(),
      ]);
      setAssignments(assignList);
      setVehicles(vehList);
      setDrivers(drvList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dispatch operations.');
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
    const map = new Map<string, TransportAssignment>();
    assignments.forEach((a) => map.set(a.trip_id, a));
    return map;
  }, [assignments]);

  const stats = useMemo(() => {
    const counts: Record<TransportStatus, number> = {
      pending: 0, assigned: 0, en_route: 0, completed: 0, delayed: 0,
    };
    trips.forEach((t) => {
      const s = (assignmentByTrip.get(t.id)?.status || 'pending') as TransportStatus;
      counts[s] += 1;
    });
    return counts;
  }, [trips, assignmentByTrip]);

  const delayedRows = useMemo(
    () => assignments.filter((a) => a.status === 'delayed'),
    [assignments],
  );

  const rows = useMemo(() => {
    return trips.map((trip) => ({
      trip,
      assignment: assignmentByTrip.get(trip.id) || null,
      status: (assignmentByTrip.get(trip.id)?.status || 'pending') as TransportStatus,
    }));
  }, [trips, assignmentByTrip]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (focusTripId && r.trip.id !== focusTripId) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.trip.id.toLowerCase().includes(q) ||
        (r.trip.title || '').toLowerCase().includes(q) ||
        (r.assignment?.vehicle?.name || '').toLowerCase().includes(q) ||
        (r.assignment?.vehicle?.registration_number || '').toLowerCase().includes(q) ||
        (r.assignment?.driver?.name || '').toLowerCase().includes(q) ||
        `${r.assignment?.origin || ''} ${r.assignment?.destination || ''}`.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, statusFilter, focusTripId]);

  const openAssign = (tripId: string) => {
    const existing = assignmentByTrip.get(tripId);
    const trip = trips.find((t) => t.id === tripId);
    setFormVehicleId(existing?.vehicle_id || '');
    setFormDriverId(existing?.driver_id || '');
    setFormOrigin(existing?.origin || trip?.origin || '');
    setFormDestination(existing?.destination || trip?.destination?.name || '');
    setFormPickup(existing?.pickup_at ? existing.pickup_at.slice(0, 16) : trip?.start_date ? trip.start_date.slice(0, 16) : '');
    setFormDropoff(existing?.dropoff_at ? existing.dropoff_at.slice(0, 16) : trip?.end_date ? trip.end_date.slice(0, 16) : '');
    setAssignDialog({ tripId });
  };

  const submitAssign = async () => {
    if (!assignDialog) return;
    setSubmitting(true);
    try {
      const payload = {
        vehicle_id: formVehicleId || null,
        driver_id: formDriverId || null,
        origin: formOrigin.trim() || null,
        destination: formDestination.trim() || null,
        pickup_at: formPickup || null,
        dropoff_at: formDropoff || null,
      };
      const exists = assignmentByTrip.get(assignDialog.tripId);
      if (exists) {
        await TourFlowApi.changeTransportAssignment(assignDialog.tripId, payload);
        showToast('ok', `Transport reassigned for ${assignDialog.tripId}.`);
      } else {
        await TourFlowApi.assignTransport({ trip_id: assignDialog.tripId, ...payload });
        showToast('ok', `Transport assigned for ${assignDialog.tripId}.`);
      }
      setAssignDialog(null);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStatus = async () => {
    if (!statusDialog) return;
    if (statusDialog.to === 'delayed' && !formReason.trim()) {
      showToast('err', 'A delay reason is required.');
      return;
    }
    if (['en_route', 'completed', 'delayed'].includes(statusDialog.to)) {
      const label = ACTION_LABELS[statusDialog.to] || statusDialog.to;
      if (!window.confirm(`${label} for trip ${statusDialog.tripId}?`)) return;
    }
    setSubmitting(true);
    try {
      await TourFlowApi.setTransportStatus(statusDialog.tripId, statusDialog.to, formReason.trim() || undefined);
      showToast('ok', `Trip ${statusDialog.tripId} → ${statusDialog.to.replace('_', ' ')}.`);
      setStatusDialog(null);
      setFormReason('');
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Status change failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitNotify = async () => {
    if (!notifyDialog) return;
    setSubmitting(true);
    setNotifyResult(null);
    try {
      const result = await TourFlowApi.notifyTraveler(notifyDialog.tripId, formEvent, formNote.trim() || undefined);
      setNotifyResult(`Sent via backend: "${result.title}" → ${result.user_id} at ${result.created_at || 'now'}.`);
      showToast('ok', `Traveler notified for ${notifyDialog.tripId}.`);
    } catch (err: any) {
      showToast('err', err?.message || 'Notification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFleet = async () => {
    setSubmitting(true);
    try {
      if (fleetDialog === 'vehicle') {
        if (!formName.trim() || !formReg.trim()) throw new Error('Vehicle name and registration number are required.');
        const cap = Number(formCapacity);
        if (!Number.isInteger(cap) || cap < 1) throw new Error('Capacity must be a positive whole number.');
        await TourFlowApi.createVehicle({ name: formName.trim(), registration_number: formReg.trim(), vehicle_type: formType, capacity: cap });
        showToast('ok', `Vehicle ${formReg.trim()} onboarded.`);
      } else {
        if (!formName.trim()) throw new Error('Driver name is required.');
        await TourFlowApi.createDriver({ name: formName.trim(), phone: formPhone.trim() || undefined, license_number: formLicense.trim() || undefined });
        showToast('ok', `Driver ${formName.trim()} onboarded.`);
      }
      setFleetDialog(null);
      setFormName(''); setFormReg(''); setFormPhone(''); setFormLicense('');
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Fleet update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Transport Dispatch Console</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              TRIP → VEHICLE → DRIVER → STATUS
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Live journey lifecycle persisted in the operations database. Auto-refreshes every 30s.
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(stats) as TransportStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setView('dispatch'); }}
            className={`p-3 rounded-2xl border text-left ${STATUS_STYLES[s]} border`}
          >
            <div className="text-xl font-black font-mono">{stats[s]}</div>
            <div className="text-[10px] uppercase font-bold">{s.replace('_', ' ')}</div>
          </button>
        ))}
      </div>

      {delayedRows.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-black uppercase">
            <AlertTriangle className="w-4 h-4" /> {delayedRows.length} delayed journey{delayedRows.length > 1 ? 's' : ''} need attention
          </div>
          {delayedRows.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
              <span className="font-mono font-bold text-sky-400">{d.trip_id}</span>
              <span>{d.vehicle?.name || 'No vehicle'} · {d.driver?.name || 'No driver'}</span>
              <span className="text-rose-300">{d.delay_reason}</span>
              <button onClick={() => setStatusDialog({ tripId: d.trip_id, to: d.pre_delay_status === 'en_route' ? 'en_route' : 'assigned' })} className="text-emerald-300 font-bold hover:underline">Resolve →</button>
              <button onClick={() => { setNotifyDialog({ tripId: d.trip_id }); setFormEvent('delay'); setNotifyResult(null); }} className="text-sky-300 font-bold hover:underline">Notify traveler</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {(['dispatch', 'fleet', 'drivers'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${view === v ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            {v === 'dispatch' ? `Dispatch Board (${rows.length})` : v === 'fleet' ? `Vehicles (${vehicles.length})` : `Drivers (${drivers.length})`}
          </button>
        ))}
      </div>

      {view === 'dispatch' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trip, vehicle, registration, driver, route..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TransportStatus)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="en_route">En Route</option>
              <option value="delayed">Delayed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading dispatch board...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Car className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <div className="font-bold text-white text-sm">No Journeys Found</div>
              <p className="text-xs mt-1">No trips match the current search or status filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(({ trip, assignment: a, status }) => {
                // Traveler pick vs operational vehicle/driver (same trip record).
                const rowView = transportRowView(trip, a);
                return (
                <div key={trip.id} className={`bg-slate-900 border rounded-2xl p-5 space-y-3 ${status === 'delayed' ? 'border-rose-500/50' : 'border-slate-800'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-sky-400 truncate">{trip.id}</span>
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">{trip.title}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => openAssign(trip.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                        {a ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />} {a ? 'Reassign' : 'Assign'}
                      </button>
                      {NEXT_ACTIONS[status].map((next) => (
                        <button
                          key={next}
                          onClick={() => { setStatusDialog({ tripId: trip.id, to: next }); setFormReason(''); }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 ${
                            next === 'delayed'
                              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                        >
                          {next === 'en_route' && <Play className="w-3 h-3" />}
                          {next === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {next === 'delayed' && <Flag className="w-3 h-3" />}
                          {ACTION_LABELS[next] || next}
                        </button>
                      ))}
                      <button onClick={() => { setNotifyDialog({ tripId: trip.id }); setFormEvent(status === 'delayed' ? 'delay' : 'assignment'); setNotifyResult(null); setFormNote(''); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Notify
                      </button>
                      <button onClick={() => onSelectTrip(trip.id)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold">Open →</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle</div>
                      <div className="text-slate-200 font-semibold truncate">
                        {rowView.hasOperationalVehicle && a?.vehicle
                          ? `${a.vehicle.name} (${a.vehicle.registration_number})`
                          : rowView.travelerPickLabel || 'No traveler selection'}
                      </div>
                      <div className="text-slate-500 text-[11px]">{a?.vehicle ? `${a.vehicle.vehicle_type} · ${a.vehicle.capacity} seats` : 'no operational vehicle'}</div>
                      <div className="text-[11px] mt-1 space-y-0.5">
                        <div className={rowView.travelerPickLabel ? 'text-sky-300/90' : 'text-slate-500'}>
                          {rowView.travelerPickLabel ? `Traveler selection: ✓ ${rowView.travelerPickLabel}` : 'Traveler selection: —'}
                        </div>
                        <div className={rowView.hasOperationalVehicle ? 'text-emerald-300/90' : 'text-amber-300/90'}>
                          {rowView.hasOperationalVehicle ? 'Operator assignment: ✓ Vehicle attached' : 'Operator assignment: ⚠ Pending'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><Users className="w-3 h-3" /> Driver</div>
                      <div className="text-slate-200 font-semibold truncate">{a?.driver?.name || 'Unassigned'}</div>
                      <div className="text-slate-500 text-[11px]">{a?.driver?.phone || 'assign a driver'}</div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Route</div>
                      <div className="text-slate-200 font-semibold truncate">{a?.origin || trip.origin || '?'} → {a?.destination || trip.destination?.name || '?'}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDT(a?.pickup_at)} → {fmtDT(a?.dropoff_at)}</div>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Journey</div>
                      <div className="text-slate-200 font-semibold text-[11px] leading-snug">
                        {!a && 'No dispatch assignment yet.'}
                        {a && status === 'pending' && 'Incomplete: vehicle + driver + pickup/drop required.'}
                        {a && status === 'assigned' && 'Ready for departure.'}
                        {a && status === 'en_route' && 'Vehicle is on the road.'}
                        {a && status === 'completed' && 'Journey finished.'}
                        {a && status === 'delayed' && (a.delay_reason || 'Delayed.')}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'fleet' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setFleetDialog('vehicle'); setFormName(''); setFormReg(''); setFormType('private_cab'); setFormCapacity('4'); }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Onboard Vehicle
            </button>
          </div>
          {vehicles.length === 0 && !loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">No vehicles in dispatch inventory.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {vehicles.map((v) => {
                const linked = assignments.filter((a) => a.vehicle_id === v.id && ['assigned', 'en_route', 'delayed'].includes(a.status));
                return (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-sky-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{v.registration_number}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${v.is_active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {v.is_active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{v.name}</div>
                    <div className="text-xs text-slate-400">{v.vehicle_type} · {v.capacity} seats</div>
                    <div className="text-xs text-slate-500">
                      {linked.length === 0 ? 'No active commitments.' : `Committed to: ${linked.map((l) => l.trip_id).join(', ')}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'drivers' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setFleetDialog('driver'); setFormName(''); setFormPhone(''); setFormLicense(''); }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Onboard Driver
            </button>
          </div>
          {drivers.length === 0 && !loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">No drivers on the roster.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {drivers.map((d) => {
                const linked = assignments.filter((a) => a.driver_id === d.id && ['assigned', 'en_route', 'delayed'].includes(a.status));
                return (
                  <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">{d.name}</div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${d.is_active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {d.is_active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{d.phone || 'No phone'} {d.license_number ? `· Lic ${d.license_number}` : ''}</div>
                    <div className="text-xs text-slate-500">
                      {linked.length === 0 ? 'No active commitments.' : `Committed to: ${linked.map((l) => l.trip_id).join(', ')}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {assignDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Dispatch — {assignDialog.tripId}</h3>
              <button onClick={() => setAssignDialog(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Vehicle (live inventory)</label>
                <select value={formVehicleId} onChange={(e) => setFormVehicleId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="">— None —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Driver (live roster)</label>
                <select value={formDriverId} onChange={(e) => setFormDriverId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="">— None —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Origin</label>
                <input type="text" value={formOrigin} onChange={(e) => setFormOrigin(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Destination</label>
                <input type="text" value={formDestination} onChange={(e) => setFormDestination(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Pickup</label>
                <input type="datetime-local" value={formPickup} onChange={(e) => setFormPickup(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Drop-off</label>
                <input type="datetime-local" value={formDropoff} onChange={(e) => setFormDropoff(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignDialog(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitAssign} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {(ACTION_LABELS[statusDialog.to] || statusDialog.to) + ` — ${statusDialog.tripId}`}
              </h3>
              <button onClick={() => setStatusDialog(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {statusDialog.to === 'delayed' && (
              <>
                <label className="block text-xs text-slate-400 font-bold uppercase">Delay reason (required)</label>
                <textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={3} placeholder="e.g. Landslide on NH-3, revised pickup +2h" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setStatusDialog(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitStatus} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notifyDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Notify Traveler — {notifyDialog.tripId}</h3>
              <button onClick={() => setNotifyDialog(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-xs text-slate-400 font-bold uppercase">Event</label>
            <select value={formEvent} onChange={(e) => setFormEvent(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              {NOTIFY_EVENTS.map((ev) => (
                <option key={ev} value={ev}>{ev.replace('_', ' ')}</option>
              ))}
            </select>
            <label className="block text-xs text-slate-400 font-bold uppercase">Operator note (optional)</label>
            <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={3} placeholder="e.g. Driver will call 30 min before pickup" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            {notifyResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">{notifyResult}</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setNotifyDialog(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Close</button>
              <button onClick={submitNotify} disabled={submitting} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> {submitting ? 'Sending...' : 'Send via Backend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {fleetDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{fleetDialog === 'vehicle' ? 'Onboard Vehicle' : 'Onboard Driver'}</h3>
              <button onClick={() => setFleetDialog(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-xs text-slate-400 font-bold uppercase">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            {fleetDialog === 'vehicle' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Registration number</label>
                  <input type="text" value={formReg} onChange={(e) => setFormReg(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Type</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    {['private_cab', 'volvo_bus', 'flight', 'train', 'self_drive', 'boat'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Capacity</label>
                  <input type="number" min={1} value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
            ) : (
              <>
                <label className="block text-xs text-slate-400 font-bold uppercase">Phone</label>
                <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                <label className="block text-xs text-slate-400 font-bold uppercase">License number</label>
                <input type="text" value={formLicense} onChange={(e) => setFormLicense(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setFleetDialog(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitFleet} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Auto-refresh 30s</span>
        <span>Lifecycle: pending → assigned → en route → completed, with delay handling. Conflicts are rejected by the backend (409).</span>
      </div>
    </div>
  );
};
