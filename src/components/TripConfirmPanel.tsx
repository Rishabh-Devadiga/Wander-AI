import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Trip } from '../types/tourflow';
import { TourFlowApi } from '../services/api';

interface TripConfirmPanelProps {
  trip: Trip;
  onConfirmed: (trip: Trip) => void;
}

/**
 * Shared traveler Review & Confirm panel (single confirmation system).
 * Used by both the AI console itinerary tab and the workspace detail view.
 * All state comes from the passed trip; confirmation uses the existing
 * POST /api/trips/:id/confirm flow with backend validation + idempotency.
 */
export const TripConfirmPanel: React.FC<TripConfirmPanelProps> = ({ trip, onConfirmed }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirmingTrip, setIsConfirmingTrip] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const confirmableItems = (trip.itinerary || []).filter((i) => !i.is_disabled);
  const confirmHotels = (trip.itinerary || []).filter((i) => i.item_type === 'hotel');
  const confirmActivities = (trip.itinerary || []).filter((i) =>
    ['activity', 'sightseeing', 'leisure'].includes(i.item_type),
  );

  const handleConfirmTrip = async () => {
    setIsConfirmingTrip(true);
    setConfirmError(null);
    try {
      const result = await TourFlowApi.confirmTrip(trip.id);
      setShowConfirmModal(false);
      onConfirmed(result.trip);
    } catch (err: any) {
      setConfirmError(err?.message || 'Confirmation failed.');
    } finally {
      setIsConfirmingTrip(false);
    }
  };

  return (
    <>
      <div id="panel-review-confirm" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        {trip.status === 'confirmed' ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-stone-900">Trip Confirmed ✓</h3>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Trip ID: <strong className="font-mono">{trip.id}</strong>
                {trip.confirmed_at && (
                  <> · confirmed {new Date(trip.confirmed_at).toLocaleString()}</>
                )}
              </p>
              <p className="text-xs text-stone-600 mt-0.5">
                Your trip has been confirmed and submitted to our operations team.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">Review & Confirm Your Trip</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {confirmableItems.length} itinerary items · {confirmHotels.length} hotel stays · {confirmActivities.length} activities · {trip.traveler_count} travelers
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setConfirmError(null); setShowConfirmModal(true); }}
                disabled={trip.status !== 'planning' || isConfirmingTrip}
                className="px-6 py-3 rounded-full bg-stone-950 hover:bg-black text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirm Trip</span>
              </button>
            </div>
            {trip.status !== 'planning' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Only trips in planning status can be confirmed (current: {trip.status}).
              </p>
            )}
          </>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-stone-900 font-display">Confirm your trip?</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Your selected hotels and activities will be submitted to our operations team for processing.
                Once confirmed, this trip will appear in the operator portal.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 text-xs space-y-2">
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Trip ID</span><span className="font-mono font-bold text-stone-900 text-right break-all">{trip.id}</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Destination</span><span className="font-bold text-stone-900 text-right">{trip.destination?.name || '—'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Dates</span><span className="font-bold text-stone-900 text-right">{trip.start_date?.slice(0, 10) || '?'} → {trip.end_date?.slice(0, 10) || '?'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Travelers</span><span className="font-bold text-stone-900">{trip.traveler_count}</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Hotels</span><span className="font-bold text-stone-900 text-right">{trip.selected_accommodation ? trip.selected_accommodation.name : (confirmHotels.length > 0 ? `${confirmHotels.length} stays` : 'None selected')}</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Activities</span><span className="font-bold text-stone-900">{confirmActivities.length} selected</span></div>
              <div className="flex justify-between gap-2"><span className="text-stone-500 font-semibold">Transport</span><span className="font-bold text-stone-900 text-right">{trip.selected_transport ? `${trip.selected_transport.operator} (${trip.selected_transport.mode})` : 'To be dispatched'}</span></div>
              <div className="flex justify-between gap-2 pt-2 border-t border-stone-200"><span className="text-stone-500 font-semibold">Total</span><span className="font-black text-stone-900">₹{(trip.total_cost || trip.total_budget || 0).toLocaleString()}</span></div>
            </div>

            {confirmError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{confirmError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isConfirmingTrip}
                className="w-full py-2.5 rounded-full border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmTrip}
                disabled={isConfirmingTrip}
                className="w-full py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isConfirmingTrip ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm Trip</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
