import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Star,
  Phone,
  Mail,
  Clock,
  Users,
  RefreshCw,
  Plus,
  Pencil,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  Trip,
  ActivityAssignment,
  ActivityAssignmentStatus,
  OpsActivityInventoryItem,
  OpsVendorMini,
  OpsVendorRow,
} from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';
import { travelerActivityRows, TravelerActivityRow } from '../../utils/opsViewModels';

interface OperatorVendorsProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  focusTripId?: string | null;
  onClearFocus?: () => void;
}

type View = 'dispatch' | 'vendors';

const STATUS_STYLES: Record<ActivityAssignmentStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  issue: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function fmtMoney(value?: number | null, currency = 'INR'): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString()}`;
}

export const OperatorVendors: React.FC<OperatorVendorsProps> = ({ trips, onSelectTrip, focusTripId, onClearFocus }) => {
  const [view, setView] = useState<View>('dispatch');
  const [assignments, setAssignments] = useState<ActivityAssignment[]>([]);
  const [inventory, setInventory] = useState<OpsActivityInventoryItem[]>([]);
  const [vendors, setVendors] = useState<OpsVendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ActivityAssignmentStatus>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortKey, setSortKey] = useState<'schedule' | 'trip' | 'updated'>('schedule');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [vendorAssignments, setVendorAssignments] = useState<Record<string, ActivityAssignment[]>>({});
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Assign/edit form state (inventory-driven selects only)
  const [formTripId, setFormTripId] = useState('');
  const [formActivityId, setFormActivityId] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  const [eligibleVendors, setEligibleVendors] = useState<OpsVendorMini[]>([]);
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formParticipants, setFormParticipants] = useState('');
  const [formReason, setFormReason] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('activity');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [scheduleHint, setScheduleHint] = useState<string | null>(null);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4500);
  };

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [assignList, invList, vendorList] = await Promise.all([
        TourFlowApi.getActivityAssignments(),
        TourFlowApi.getActivityInventory(),
        TourFlowApi.getOpsVendors(),
      ]);
      setAssignments(assignList);
      setInventory(invList);
      setVendors(vendorList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity operations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(true), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!formActivityId) {
      setEligibleVendors([]);
      setFormVendorId('');
      return;
    }
    let cancelled = false;
    TourFlowApi.getEligibleVendors(formActivityId)
      .then((res) => {
        if (!cancelled) setEligibleVendors(res.vendors);
      })
      .catch(() => {
        if (!cancelled) setEligibleVendors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formActivityId]);

  const tripById = useMemo(() => {
    const map = new Map<string, Trip>();
    trips.forEach((t) => map.set(t.id, t));
    return map;
  }, [trips]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (focusTripId && a.trip_id !== focusTripId) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (dateFilter && a.scheduled_date !== dateFilter) return false;
        if (!q) return true;
        return (
          a.trip_id.toLowerCase().includes(q) ||
          (a.activity?.title || '').toLowerCase().includes(q) ||
          (a.vendor?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortKey === 'trip') return a.trip_id.localeCompare(b.trip_id);
        if (sortKey === 'updated') return (b.updated_at || '').localeCompare(a.updated_at || '');
        const ka = `${a.scheduled_date || 'zzzz'} ${a.start_time || 'zz:zz'}`;
        const kb = `${b.scheduled_date || 'zzzz'} ${b.start_time || 'zz:zz'}`;
        return ka.localeCompare(kb);
      });
  }, [assignments, searchQuery, statusFilter, dateFilter, sortKey, focusTripId]);

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((v) => {
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.phone || '').toLowerCase().includes(q) ||
        (v.contact_email || '').toLowerCase().includes(q) ||
        v.vendor_type.toLowerCase().includes(q)
      );
    });
  }, [vendors, searchQuery]);

  const stats = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, issue: 0 };
    assignments.forEach((a) => {
      counts[a.status] += 1;
    });
    return counts;
  }, [assignments]);

  // Traveler-selected itinerary activities (same trip records, no backend rows).
  // These are reference rows: vendor shows "Pending assignment", status Pending.
  const travelerSelections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.flatMap((t) => travelerActivityRows(t)).filter((r) => {
      if (focusTripId && r.tripId !== focusTripId) return false;
      if (statusFilter !== 'all' && 'pending' !== statusFilter) return false;
      if (dateFilter) return false; // traveler items carry day numbers, not dates
      if (!q) return true;
      return (
        r.tripId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [trips, searchQuery, statusFilter, dateFilter, focusTripId]);

  const openAssign = () => {
    setEditingId(null);
    setFormTripId(focusTripId || '');
    setFormActivityId('');
    setFormVendorId('');
    setFormDate('');
    setFormStart('');
    setFormEnd('');
    const focusTrip = focusTripId ? trips.find((t) => t.id === focusTripId) : undefined;
    setFormParticipants(focusTrip ? String(focusTrip.traveler_count || '') : '');
    setScheduleHint(null);
    setAssignOpen(true);
  };

  const openEdit = (a: ActivityAssignment) => {
    setEditingId(a.id);
    setFormTripId(a.trip_id);
    setFormActivityId(a.activity_id);
    setFormVendorId(a.vendor_id || '');
    setFormDate(a.scheduled_date || '');
    setFormStart(a.start_time || '');
    setFormEnd(a.end_time || '');
    setFormParticipants(a.participants != null ? String(a.participants) : '');
    setAssignOpen(true);
  };

  const startCreateForTrip = (tripId: string) => {
    const trip = tripById.get(tripId);
    openAssign();
    setFormTripId(tripId);
    if (trip) {
      setFormParticipants(String(trip.traveler_count || ''));
      if (trip.start_date) setFormDate(trip.start_date.slice(0, 10));
    }
    setScheduleHint(null);
  };

  // Create from a traveler-selection row: date + times + participants carry
  // over from the traveler's decided schedule. Only inventory activity +
  // vendor remain operator choices.
  const startCreateFromTravelerRow = (row: TravelerActivityRow) => {
    openAssign();
    setFormTripId(row.tripId);
    setFormActivityId('');
    setFormVendorId('');
    setFormDate(row.scheduledDate || '');
    setFormStart(row.startTimeHHMM);
    setFormEnd(row.endTimeHHMM);
    setFormParticipants(String(row.participants));
    setScheduleHint(
      row.scheduledDate || row.startTimeHHMM
        ? `Schedule carried from traveler pick: Day ${row.dayNumber}` +
          (row.scheduledDate ? ` (${row.scheduledDate})` : '') +
          (row.startTimeHHMM ? ` ${row.startTimeHHMM}${row.endTimeHHMM ? ` → ${row.endTimeHHMM}` : ''}` : '') +
          '.'
        : null,
    );
  };

  const handleTripSelect = (id: string) => {
    setFormTripId(id);
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    // Prefill from what the traveler entered: party size + trip start date.
    // Times stay empty (no per-activity traveler times exist) for the operator.
    setFormParticipants((prev) => (prev.trim() === '' ? String(t.traveler_count || '') : prev));
    setFormDate((prev) => (prev === '' && t.start_date ? t.start_date.slice(0, 10) : prev));
  };

  const submitAssign = async () => {
    setSubmitting(true);
    try {
      if (!formTripId) throw new Error('Select a trip.');
      if (!formActivityId) throw new Error('Select an activity from inventory.');
      const participants = formParticipants.trim() === '' ? null : Number(formParticipants);
      if (participants !== null && (!Number.isInteger(participants) || participants < 0)) {
        throw new Error('Participants must be a non-negative whole number.');
      }
      if (editingId) {
        await TourFlowApi.changeActivityAssignment(editingId, {
          activity_id: formActivityId,
          vendor_id: formVendorId || null,
          vendor_cleared: !formVendorId,
          scheduled_date: formDate || null,
          start_time: formStart || null,
          end_time: formEnd || null,
          participants,
        });
        showToast('ok', 'Activity assignment updated.');
      } else {
        await TourFlowApi.assignActivity({
          trip_id: formTripId,
          activity_id: formActivityId,
          vendor_id: formVendorId || null,
          scheduled_date: formDate || null,
          start_time: formStart || null,
          end_time: formEnd || null,
          participants,
        });
        showToast('ok', `Activity assigned to ${formTripId}.`);
      }
      setAssignOpen(false);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirm this activity assignment?')) return;
    try {
      await TourFlowApi.confirmActivityAssignment(id);
      showToast('ok', 'Assignment confirmed.');
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Confirm failed.');
    }
  };

  const handleFlag = async (id: string) => {
    if (!formReason.trim()) {
      showToast('err', 'Enter a reason to flag the issue.');
      return;
    }
    if (!window.confirm('Flag this assignment as an issue?')) return;
    try {
      await TourFlowApi.flagActivityIssue(id, formReason.trim());
      showToast('ok', 'Issue flagged.');
      setFormReason('');
      setConfirmTarget(null);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Flag failed.');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const updated = await TourFlowApi.resolveActivityIssue(id);
      showToast('ok', `Issue resolved → ${updated.status}.`);
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Resolve failed.');
    }
  };

  const toggleVendor = async (id: string, current: boolean) => {
    if (!window.confirm(`${current ? 'Suspend' : 'Reactivate'} this vendor? Eligibility for new assignments changes immediately.`)) return;
    try {
      await TourFlowApi.setVendorVerified(id, !current);
      showToast('ok', 'Vendor status updated.');
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Vendor update failed.');
    }
  };

  const toggleVendorAssignments = async (vendorId: string) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
      return;
    }
    setExpandedVendor(vendorId);
    if (!vendorAssignments[vendorId]) {
      try {
        const detail = await TourFlowApi.getVendorAssignments(vendorId);
        setVendorAssignments((prev) => ({ ...prev, [vendorId]: detail.assignments }));
      } catch (err: any) {
        showToast('err', err?.message || 'Failed to load vendor assignments.');
      }
    }
  };

  const submitOnboard = async () => {
    setSubmitting(true);
    try {
      if (!formName.trim()) throw new Error('Vendor name is required.');
      await TourFlowApi.onboardVendor({
        name: formName.trim(),
        vendor_type: formType,
        contact_email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
      });
      showToast('ok', `Vendor ${formName.trim()} onboarded.`);
      setOnboardOpen(false);
      setFormName(''); setFormEmail(''); setFormPhone('');
      await refresh(true);
    } catch (err: any) {
      showToast('err', err?.message || 'Onboarding failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const detail = detailId ? assignments.find((a) => a.id === detailId) || null : null;

  const renderRow = (a: ActivityAssignment) => {
    const trip = tripById.get(a.trip_id);
    return (
      <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold text-sky-400 truncate">{a.trip_id}</span>
            {trip && <span className="text-xs text-slate-400 truncate hidden sm:inline">{trip.title}</span>}
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[a.status]}`}>
              {a.status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setDetailId(a.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Details
            </button>
            <button onClick={() => openEdit(a)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {a.status === 'pending' && (
              <button onClick={() => handleConfirm(a.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Confirm
              </button>
            )}
            {a.status === 'issue' ? (
              <button onClick={() => handleResolve(a.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg">
                Resolve
              </button>
            ) : (
              <button onClick={() => { setConfirmTarget(a.id); setFormReason(''); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Flag
              </button>
            )}
            <button onClick={() => onSelectTrip(a.trip_id)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold">Open →</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Activity</div>
            <div className="text-slate-200 font-semibold truncate">{a.activity?.title || a.activity_id}</div>
            <div className="text-slate-500 text-[11px]">{a.activity?.category || ''}{a.activity?.duration_hours ? ` · ${a.activity.duration_hours}h` : ''}</div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Vendor</div>
            <div className="text-slate-200 font-semibold truncate">{a.vendor?.name || 'Unassigned'}</div>
            <div className="text-slate-500 text-[11px]">{a.vendor?.phone || 'no vendor yet'}</div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Schedule</div>
            <div className="text-slate-200 font-semibold">{a.scheduled_date || 'Unscheduled'}</div>
            <div className="text-slate-500 text-[11px]">{a.start_time || '?'} → {a.end_time || '?'}</div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Allocation / Price</div>
            <div className="text-slate-200 font-semibold">
              {a.participants != null ? `${a.participants} pax` : '—'}
              {a.activity?.capacity != null && (
                <span className={a.remaining_capacity != null && a.remaining_capacity < 0 ? 'text-rose-400' : 'text-slate-500'}>
                  {' '} / cap {a.activity.capacity}
                </span>
              )}
            </div>
            <div className="text-emerald-400 font-bold font-mono text-[11px]">
              {a.price?.total_price != null ? `${fmtMoney(a.price.total_price, a.price.currency)} total` : a.price ? `${fmtMoney(a.price.unit_price, a.price.currency)}/person` : '—'}
            </div>
          </div>
        </div>

        {a.status === 'issue' && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
            Issue: {a.issue_reason || 'Needs attention.'}
          </div>
        )}

        {confirmTarget === a.id && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Issue reason (required)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <button onClick={() => handleFlag(a.id)} className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl">Confirm Flag</button>
              <button onClick={() => { setConfirmTarget(null); setFormReason(''); }} className="px-3 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Activities & Vendors Operations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              TRIP → ACTIVITY → VENDOR → STATUS
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Dispatch board persisted in the operations database. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAssign} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Assign Activity
          </button>
          <button onClick={() => refresh()} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${toast.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {toast.text}
        </div>
      )}
      {focusTripId && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-between gap-2">
          <span>Assigning services for trip <span className="font-mono">{focusTripId}</span> — dispatch filtered to this trip.</span>
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

      <div className="grid grid-cols-3 gap-2 max-w-md">
        {(['pending', 'confirmed', 'issue'] as ActivityAssignmentStatus[]).map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setView('dispatch'); }} className={`p-3 rounded-2xl border text-left ${STATUS_STYLES[s]} border`}>
            <div className="text-xl font-black font-mono">{stats[s]}</div>
            <div className="text-[10px] uppercase font-bold">{s}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(['dispatch', 'vendors'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${view === v ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            {v === 'dispatch' ? `Dispatch Board (${assignments.length})` : `Vendors (${vendors.length})`}
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
            placeholder={view === 'dispatch' ? 'Search trip ID, activity, or vendor...' : 'Search vendor, phone, email, type...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        {view === 'dispatch' && (
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ActivityAssignmentStatus)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="all">All statuses</option>
              <option value="pending">Pending only</option>
              <option value="confirmed">Confirmed only</option>
              <option value="issue">Issues only</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as 'schedule' | 'trip' | 'updated')} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="schedule">Sort: schedule</option>
              <option value="trip">Sort: trip ID</option>
              <option value="updated">Sort: recently updated</option>
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading activity operations...</div>
      ) : view === 'dispatch' ? (
        <>
          {travelerSelections.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Traveler selections awaiting assignment ({travelerSelections.length})
              </h3>
              <div className="space-y-2">
                {travelerSelections.map((r) => (
                  <div key={r.key} className="bg-slate-900 border border-dashed border-sky-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-sky-400 truncate">{r.tripId}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30">
                          Pending
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-1">{r.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Traveler selection: ✓ {r.tripTitle} · Day {r.dayNumber}
                        {r.startTime ? ` · ${r.startTime}${r.endTime ? ` → ${r.endTime}` : ''}` : ''}
                        {' '}· {r.participants} pax · ₹{r.cost.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-amber-300/90 mt-0.5">
                        Vendor: Pending assignment · Operator assignment: ⚠ Pending
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startCreateFromTravelerRow(r)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                      >
                        Create assignment
                      </button>
                      <button onClick={() => onSelectTrip(r.tripId)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold">
                        Open →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && travelerSelections.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <div className="font-bold text-white text-sm">No Activity Assignments</div>
              <p className="text-xs mt-1">No assignments match the current filters. Assign an activity to get started.</p>
              <button onClick={openAssign} className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Assign Activity</button>
            </div>
          ) : (
            <div className="space-y-3">{filtered.map(renderRow)}</div>
          )}
        </>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Vendors Found</div>
          <p className="text-xs mt-1">No vendors match the current search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setOnboardOpen(true); setFormName(''); setFormEmail(''); setFormPhone(''); setFormType('activity'); }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Onboard Vendor
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredVendors.map((v) => (
              <div key={v.id} className={`bg-slate-900 border rounded-2xl p-5 space-y-3 ${v.is_verified ? 'border-slate-800' : 'border-rose-900/50 opacity-80'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{v.vendor_type}</span>
                    <h3 className="text-base font-bold text-white mt-1.5">{v.name}</h3>
                    <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                      {v.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" />{v.phone}</div>}
                      {v.contact_email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-500" />{v.contact_email}</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleVendor(v.id, v.is_verified)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${v.is_verified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}
                    title="Toggle verified status (drives assignment eligibility)"
                  >
                    {v.is_verified ? 'Verified' : 'Suspended'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-current" />{v.rating}</span>
                  <span className="text-slate-400">Trips served: <strong className="text-white font-mono">{v.assigned_trip_count}</strong></span>
                </div>
                <button
                  onClick={() => toggleVendorAssignments(v.id)}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                >
                  {expandedVendor === v.id ? 'Hide assignments' : `View assignments (${v.assigned_trip_count} trips)`}
                </button>
                {expandedVendor === v.id && (
                  <div className="space-y-1.5">
                    {(vendorAssignments[v.id] || []).length === 0 ? (
                      <div className="text-xs text-slate-500">No activities currently assigned to this vendor.</div>
                    ) : (
                      (vendorAssignments[v.id] || []).map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <div className="min-w-0">
                            <div className="font-mono text-sky-400 truncate">{a.trip_id}</div>
                            <div className="text-slate-400 truncate">{a.activity?.title} · {a.scheduled_date || 'unscheduled'} {a.start_time || ''}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase shrink-0 ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{editingId ? 'Edit Activity Assignment' : 'Assign Activity to Trip'}</h3>
              <button onClick={() => setAssignOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {!editingId && (
              <>
                <label className="block text-xs text-slate-400 font-bold uppercase">Trip (live trip list)</label>
                <select value={formTripId} onChange={(e) => handleTripSelect(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="">— Select trip —</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>{t.id} — {t.title} ({t.traveler_count} pax)</option>
                  ))}
                </select>
              </>
            )}
            <label className="block text-xs text-slate-400 font-bold uppercase">Activity (live inventory)</label>
            <select value={formActivityId} onChange={(e) => setFormActivityId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">— Select activity —</option>
              {inventory.map((a) => (
                <option key={a.id} value={a.id}>{a.title} — {a.destination_name || ''} (₹{a.price_per_person.toLocaleString()}/person{a.capacity != null ? `, cap ${a.capacity}` : ''})</option>
              ))}
            </select>
            <label className="block text-xs text-slate-400 font-bold uppercase">Vendor (eligible only)</label>
            <select value={formVendorId} onChange={(e) => setFormVendorId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">— No vendor (pending) —</option>
              {eligibleVendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.vendor_type}, ★{v.rating})</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Start</label>
                <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">End</label>
                <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Participants</label>
              <input type="number" min={0} value={formParticipants} onChange={(e) => setFormParticipants(e.target.value)} placeholder="e.g. 4" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            {formTripId && !scheduleHint && (
              <p className="text-[11px] text-sky-300/90 bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2">
                Date defaults to the traveler's trip start ({trips.find((t) => t.id === formTripId)?.start_date?.slice(0, 10) || '—'}); times are operator-set.
              </p>
            )}
            {scheduleHint && (
              <p className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                {scheduleHint}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitAssign} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Assign Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {onboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Onboard Vendor</h3>
              <button onClick={() => setOnboardOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-xs text-slate-400 font-bold uppercase">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            <label className="block text-xs text-slate-400 font-bold uppercase">Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              {['activity', 'guide', 'hotel', 'transport'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="block text-xs text-slate-400 font-bold uppercase">Email</label>
            <input type="text" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            <label className="block text-xs text-slate-400 font-bold uppercase">Phone</label>
            <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOnboardOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitOnboard} disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving...' : 'Onboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Assignment Detail</h3>
              <button onClick={() => setDetailId(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {([
              ['Trip', `${detail.trip_id}${tripById.get(detail.trip_id) ? ` — ${tripById.get(detail.trip_id)?.title}` : ''}`],
              ['Activity', `${detail.activity?.title || detail.activity_id} (${detail.activity?.category || '?'})`],
              ['Vendor', detail.vendor ? `${detail.vendor.name} · ${detail.vendor.phone || 'no phone'} · ${detail.vendor.contact_email || 'no email'}` : 'Unassigned'],
              ['Schedule', `${detail.scheduled_date || 'Unscheduled'} · ${detail.start_time || '?'} → ${detail.end_time || '?'}`],
              ['Capacity', detail.activity?.capacity != null ? `Allocated ${detail.participants ?? '—'} of ${detail.activity.capacity} (remaining ${detail.remaining_capacity ?? '—'})` : `Allocated ${detail.participants ?? '—'} (capacity unknown)`],
              ['Price', detail.price?.total_price != null ? `₹${detail.price.total_price.toLocaleString()} total (${detail.price.participants} × ₹${detail.price.unit_price.toLocaleString()})` : `₹${(detail.price?.unit_price || 0).toLocaleString()}/person`],
              ['Status', `${detail.status}${detail.issue_reason ? ` — ${detail.issue_reason}` : ''}`],
              ['Traveler picks', (() => {
                const items = (tripById.get(detail.trip_id)?.itinerary || []).filter((i: any) =>
                  ['activity', 'sightseeing', 'leisure'].includes(i.item_type),
                );
                return items.length > 0
                  ? items.slice(0, 5).map((i: any) => i.title).join(' · ') + (items.length > 5 ? ` (+${items.length - 5} more)` : '')
                  : 'No traveler activity picks on this trip';
              })()],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 uppercase font-bold text-[10px] pt-0.5">{label}</span>
                <span className="text-slate-200 font-semibold text-right">{value}</span>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              {detail.status === 'pending' && (
                <button onClick={() => { setDetailId(null); handleConfirm(detail.id); }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Confirm</button>
              )}
              {detail.status === 'issue' ? (
                <button onClick={() => { setDetailId(null); handleResolve(detail.id); }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Resolve</button>
              ) : (
                <button onClick={() => { setDetailId(null); setConfirmTarget(detail.id); setFormReason(''); }} className="px-4 py-2 rounded-xl bg-slate-800 text-amber-300 text-xs font-bold border border-slate-700">Flag Issue</button>
              )}
              <button onClick={() => { setDetailId(null); onSelectTrip(detail.trip_id); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">Open Trip →</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Auto-refresh 30s</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Price = backend unit rate × participants; capacity enforced server-side (409 on over-allocation).</span>
      </div>
    </div>
  );
};
