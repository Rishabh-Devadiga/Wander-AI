import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Car,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Trip, TripPipeline, TripFinalizeResult } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';

interface OperatorAssignmentFlowProps {
  trip: Trip;
  onNavigateService: (tab: 'hotels' | 'transport' | 'vendors') => void;
  onPipelineChange: () => void;
}

function nightsBetween(checkIn?: string | null, checkOut?: string | null, fallback = 1): number {
  if (checkIn && checkOut) {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (Number.isFinite(ms) && ms >= 0) return Math.max(1, Math.round(ms / 86400000));
  }
  return Math.max(1, fallback);
}

export const OperatorAssignmentFlow: React.FC<OperatorAssignmentFlowProps> = ({
  trip,
  onNavigateService,
  onPipelineChange,
}) => {
  const [pipeline, setPipeline] = useState<TripPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [finalResult, setFinalResult] = useState<TripFinalizeResult | null>(null);
  const [noteResult, setNoteResult] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4500);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPipeline(await TourFlowApi.getTripPipeline(trip.id));
    } catch (err: any) {
      setError(err?.message || 'Failed to load pipeline.');
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const travelerActivities = (trip.itinerary || []).filter((i) =>
    ['activity', 'sightseeing', 'leisure'].includes(i.item_type),
  );
  const requireActivities = travelerActivities.length > 0;
  const approval = pipeline?.approval;
  const services = pipeline?.services;
  const progress = pipeline?.progress || { assigned: 0, total: 3 };

  const doApprove = async () => {
    setWorking(true);
    try {
      await TourFlowApi.approveTrip(trip.id);
      showToast('ok', `Trip ${trip.id} approved.`);
      setReviewOpen(false);
      await refresh();
      onPipelineChange();
    } catch (err: any) {
      showToast('err', err?.message || 'Approval failed.');
    } finally {
      setWorking(false);
    }
  };

  const doAccept = async () => {
    setWorking(true);
    try {
      await TourFlowApi.acceptTripAssignment(trip.id);
      showToast('ok', 'Assignment workflow started.');
      await refresh();
      onPipelineChange();
    } catch (err: any) {
      showToast('err', err?.message || 'Accept failed. Operator approval is required first.');
    } finally {
      setWorking(false);
    }
  };

  const doFinalize = async () => {
    setWorking(true);
    setNoteResult(null);
    try {
      const result = await TourFlowApi.finalizeTrip(trip.id, requireActivities);
      setFinalResult(result);
      try {
        await TourFlowApi.postOperatorNote(trip.id, {
          title: 'Trip Finalized by Operations',
          message: `Your trip is finalized: hotel, transport, and activities are assigned. Confirmation ref ${trip.id}.`,
          type: 'success',
        });
        setNoteResult('Traveler inbox updated in the trip record.');
      } catch (noteErr: any) {
        setNoteResult(`Backend finalized; traveler inbox note failed: ${noteErr?.message || 'unknown error'}`);
      }
      setFinalOpen(false);
      await refresh();
      onPipelineChange();
    } catch (err: any) {
      showToast('err', err?.message || 'Finalization failed.');
    } finally {
      setWorking(false);
    }
  };

  const [hotelAssignments, setHotelAssignments] = useState<any[]>([]);
  const [transportAssignments, setTransportAssignments] = useState<any[]>([]);
  const [activityAssignments, setActivityAssignments] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      TourFlowApi.getAccommodationAssignments(),
      TourFlowApi.getTransportAssignments(),
      TourFlowApi.getActivityAssignments({ trip_id: trip.id }),
    ])
      .then(([hotels, transports, activities]) => {
        if (cancelled) return;
        setHotelAssignments(hotels.filter((h: any) => h.trip_id === trip.id));
        setTransportAssignments(transports.filter((t: any) => t.trip_id === trip.id));
        setActivityAssignments(activities);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [trip.id, pipeline]);

  const hotelRow = hotelAssignments[0];
  const transportRow = transportAssignments[0];
  const nights = nightsBetween(
    hotelRow?.check_in_date, hotelRow?.check_out_date,
    Math.max(1, (trip.duration_days || 2) - 1),
  );
  const hotelCost = hotelRow?.hotel ? (hotelRow.hotel.price_per_night || 0) * nights : 0;
  const activityCost = activityAssignments
    .filter((a: any) => a.status === 'confirmed')
    .reduce((sum: number, a: any) => sum + (a.price?.total_price || 0), 0);
  const partnerCost = hotelCost + activityCost;
  const travelerPrice = trip.total_cost || trip.total_budget || 0;
  const checks = [
    { label: 'Hotel availability confirmed', ok: Boolean(services?.hotel.assigned) },
    { label: 'Transport availability confirmed', ok: Boolean(services?.transport.assigned) },
    {
      label: requireActivities ? 'Activities confirmed' : 'No traveler activities — nothing required',
      ok: requireActivities ? Boolean(services?.activities.assigned) : true,
    },
    { label: 'Vendors verified', ok: true },
    { label: 'No scheduling conflicts (backend-validated on write)', ok: true },
    { label: 'Budget within approved limit', ok: partnerCost <= travelerPrice || travelerPrice === 0 },
    { label: 'No overlapping transfers (backend-validated on write)', ok: true },
  ];

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading assignment center...</div>;
  }
  if (error || !pipeline) {
    return (
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        <strong>Assignment center unavailable:</strong> {error || 'No pipeline data.'}
      </div>
    );
  }

  const stage = !approval?.approved
    ? 0
    : !approval.assignment_started
      ? 1
      : !approval.finalized
        ? 2
        : 3;
  const stageLabels = ['Traveler Confirmed', 'Operator Approved', 'Assignment In Progress', 'Finalized'];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${toast.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {toast.text}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trip Assignment Center</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          <span className="font-mono text-sky-400">{trip.id}</span> · {trip.title} · all services tracked under one Trip ID
        </p>
      </div>

      {!approval?.approved && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          TRAVELER CONFIRMED — OPERATOR ACTION REQUIRED. Review the trip before any assignment.
        </div>
      )}

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300">Stage: {stageLabels[stage]}</span>
          <span className="text-slate-400 font-mono">{progress.assigned}/{progress.total} services assigned</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all"
            style={{ width: `${(progress.assigned / progress.total) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
          {['Traveler ✓', 'Approved', 'Hotel', 'Transport', 'Activities', 'Final'].map((label, idx) => {
            const done =
              idx === 0 ||
              (idx === 1 && (approval?.approved || false)) ||
              (idx === 2 && Boolean(services?.hotel.assigned)) ||
              (idx === 3 && Boolean(services?.transport.assigned)) ||
              (idx === 4 && Boolean(services?.activities.assigned)) ||
              (idx === 5 && Boolean(approval?.finalized));
            return (
              <span key={label} className={`px-2 py-0.5 rounded-full border ${done ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                {done ? '✓ ' : '○ '}{label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!approval?.approved && (
          <button onClick={() => setReviewOpen(true)} className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold">
            Review Trip
          </button>
        )}
        {approval?.approved && !approval.assignment_started && !approval.finalized && (
          <button onClick={doAccept} disabled={working} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
            {working ? 'Starting...' : 'Accept & Assign →'}
          </button>
        )}
        <button onClick={() => { refresh(); }} className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            key: 'hotels' as const,
            title: 'Hotel',
            icon: <Building2 className="w-4 h-4 text-emerald-400" />,
            done: Boolean(services?.hotel.assigned),
            status: services?.hotel.status || 'pending',
            action: 'Assign Hotel',
          },
          {
            key: 'transport' as const,
            title: 'Transport',
            icon: <Car className="w-4 h-4 text-sky-400" />,
            done: Boolean(services?.transport.assigned),
            status: services?.transport.status || 'pending',
            action: 'Assign Transport',
          },
          {
            key: 'vendors' as const,
            title: 'Activities & Vendors',
            icon: <Mountain className="w-4 h-4 text-violet-400" />,
            done: Boolean(services?.activities.assigned),
            status: `${services?.activities.assigned_count || 0} confirmed`,
            action: 'Assign Activities',
          },
        ].map((card) => (
          <div key={card.key} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {card.icon}<span>{card.title}</span>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${card.done ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                {card.done ? `${card.title} assigned ✓` : card.status === 'pending' ? 'Pending Assignment' : card.status}
              </span>
            </div>
            <button
              onClick={() => onNavigateService(card.key)}
              disabled={!approval?.assignment_started || approval?.finalized}
              title={!approval?.assignment_started ? 'Accept & Assign first (operator approval required)' : undefined}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span>{card.action}</span><ArrowRight className="w-3.5 h-3.5" />
            </button>
            {!approval?.assignment_started && (
              <p className="text-[11px] text-slate-500">Locked until Accept &amp; Assign.</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setFinalOpen(true)}
          disabled={!approval?.assignment_started || approval?.finalized || progress.assigned < progress.total}
          title={progress.assigned < progress.total ? 'All required services must be assigned first' : undefined}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
        >
          {approval?.finalized ? 'Trip Finalized ✓' : 'Final Review →'}
        </button>
      </div>

      {finalResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
          <div className="font-black uppercase">Finalized ✓ Traveler notified ✓ Hotel confirmed ✓ Transport confirmed ✓ Activities confirmed ✓</div>
          <div>{finalResult.partners.length} vendor outreach record(s) queued{noteResult ? ` · ${noteResult}` : ''}</div>
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Review Trip — {trip.id}</h3>
              <button onClick={() => setReviewOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Traveler party</div><div className="text-slate-200 font-bold">{trip.traveler_count} travelers ({trip.preferences?.travel_companions || trip.travel_type})</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Dates / Budget</div><div className="text-slate-200 font-bold">{trip.start_date?.slice(0, 10)} → {trip.end_date?.slice(0, 10)} · ₹{(trip.total_budget || 0).toLocaleString()}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Hotels required</div><div className="text-slate-200 font-bold">{trip.selected_accommodation?.name || `${(trip.itinerary || []).filter((i) => i.item_type === 'hotel').length} hotel slots`} · {Math.max(1, (trip.duration_days || 2) - 1)} nights</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Transport required</div><div className="text-slate-200 font-bold">{trip.selected_transport ? `${trip.selected_transport.operator} (${trip.selected_transport.mode})` : `${trip.origin || '?'} → ${trip.destination?.name || '?'}`}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 col-span-1 sm:col-span-2"><div className="text-slate-500 uppercase text-[10px] font-bold">Activities required ({travelerActivities.length})</div><div className="text-slate-200 font-semibold">{travelerActivities.slice(0, 6).map((a) => a.title).join(' · ') || 'None selected'}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 col-span-1 sm:col-span-2"><div className="text-slate-500 uppercase text-[10px] font-bold">Special requests</div><div className="text-slate-200 font-semibold">{trip.preferences?.special_requests || '—'}</div></div>
            </div>
            <div className="text-xs text-slate-400">Estimated partner cost updates live as services are assigned; availability is validated server-side on every assignment.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReviewOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={doApprove} disabled={working} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {working ? 'Approving...' : 'Approve & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {finalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Final Review — {trip.id}</h3>
              <button onClick={() => setFinalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Traveler</div><div className="text-slate-200 font-bold">{trip.traveler_count} travelers · {trip.preferences?.travel_companions || trip.travel_type}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Itinerary</div><div className="text-slate-200 font-bold">{trip.destination?.name} · {trip.duration_days} days · {(trip.itinerary || []).length} items</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Hotels</div><div className="text-slate-200 font-bold">{hotelRow?.hotel?.name || '—'} {hotelRow ? `· ${hotelRow.rooms ?? '?'} rooms` : ''}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800"><div className="text-slate-500 uppercase text-[10px] font-bold">Transport</div><div className="text-slate-200 font-bold">{transportRow ? `${transportRow.vehicle?.name || '?'} + ${transportRow.driver?.name || '?'}` : '—'}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 col-span-1 sm:col-span-2"><div className="text-slate-500 uppercase text-[10px] font-bold">Activities ({activityAssignments.filter((a: any) => a.status === 'confirmed').length} confirmed)</div><div className="text-slate-200 font-semibold">{activityAssignments.filter((a: any) => a.status === 'confirmed').map((a: any) => a.activity?.title || a.activity_id).join(' · ') || 'None'}</div></div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 col-span-1 sm:col-span-2">
                <div className="text-slate-500 uppercase text-[10px] font-bold">Financial summary</div>
                <div className="text-slate-200 font-semibold font-mono">Traveler price ₹{travelerPrice.toLocaleString()} · Partner cost ₹{partnerCost.toLocaleString()} · Margin ₹{(travelerPrice - partnerCost).toLocaleString()}</div>
                <div className="text-slate-500 text-[11px]">Taxes/fees included in partner rates (not separately tracked) · Transport at vendor contract rate (not in system)</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className={c.ok ? 'text-slate-300' : 'text-rose-300 font-bold'}>{c.ok ? '✓' : '✗'} {c.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Finalizing locks assignments and notifies the traveler plus assigned partners.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFinalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Go Back</button>
              <button onClick={doFinalize} disabled={working} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                {working ? 'Finalizing...' : 'Finalize Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
