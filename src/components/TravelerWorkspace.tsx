import { useState, useEffect } from 'react';
import { 
   Layers, Plus, RefreshCw, Calendar, MapPin, DollarSign, 
   ChevronRight, Sparkles, AlertCircle, Compass, ShieldAlert, Trash2 
 } from 'lucide-react';
import { Trip } from '../types/tourflow';
import { TourFlowApi } from '../services/api';
import { useTripStore } from '../store/useTripStore';
import TripDetailView from './TripDetailView';

interface TravelerWorkspaceProps {
  onOpenCreateTrip: () => void;
  onOpenEditPreferences: (trip: Trip) => void;
}

export default function TravelerWorkspace({ onOpenCreateTrip, onOpenEditPreferences }: TravelerWorkspaceProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteItinerary = useTripStore((state) => state.deleteItinerary);

  const fetchTrips = async (autoSelectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all trips from canonical store
      const allTrips = await TourFlowApi.getTrips().catch(() => []);
      if (allTrips && allTrips.length > 0) {
        setTrips(allTrips);
        if (autoSelectId) {
          const matched = allTrips.find((t) => t.id === autoSelectId);
          setSelectedTrip(matched || allTrips[0]);
        } else if (!selectedTrip || !allTrips.some((t) => t.id === selectedTrip.id)) {
          setSelectedTrip(allTrips[0]);
        }
      } else {
        setTrips([]);
        setSelectedTrip(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trips from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      await deleteItinerary(tripToDelete.id);
      const remaining = trips.filter((t) => t.id !== tripToDelete.id);
      setTrips(remaining);
      if (selectedTrip?.id === tripToDelete.id) {
        setSelectedTrip(remaining.length > 0 ? remaining[0] : null);
      }
      setTripToDelete(null);
    } catch (err) {
      console.error('Failed to delete trip:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshCurrentTrip = async () => {
    if (!selectedTrip) {
      fetchTrips();
      return;
    }
    try {
      const updated = await TourFlowApi.getTrip(selectedTrip.id);
      setSelectedTrip(updated);
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="traveler-workspace-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">Trip Center</span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-600 font-bold">WanderFlow Dynamic Itineraries</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-stone-900">My Trips & Canvas</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="workspace-refresh-btn"
            onClick={() => fetchTrips()}
            className="p-2.5 rounded-full bg-white/90 hover:bg-stone-50 border border-stone-200 text-stone-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh All Trips"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="workspace-create-trip-btn"
            onClick={onOpenCreateTrip}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-sm shadow-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Plan with WanderFlow</span>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && trips.length === 0 && (
        <div className="p-12 text-center bg-white/95 backdrop-blur-xl rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-stone-700">Connecting to WanderFlow backend & database...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50/95 backdrop-blur-md border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Backend Connection Notice</p>
            <p className="text-amber-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Workspace Layout (Sidebar trip selector + Full central entity inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Trip Selector Card List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between p-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Active Itineraries ({trips.length})</h3>
          </div>

          <div className="space-y-3">
            {trips.map(trip => (
              <div
                key={trip.id}
                id={`workspace-trip-card-${trip.id}`}
                onClick={() => setSelectedTrip(trip)}
                className={`p-4 rounded-3xl cursor-pointer transition-all border text-left backdrop-blur-xl group relative ${
                  selectedTrip?.id === trip.id
                    ? 'bg-rose-50/90 border-rose-400 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-white/95 border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    trip.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {trip.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-stone-900">₹{trip.total_budget?.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTripToDelete(trip);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                      title="Delete this trip"
                      aria-label="Delete Trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-display text-base font-bold text-stone-900 line-clamp-1">{trip.title}</h4>

                <div className="flex items-center gap-2 text-[11px] text-stone-600 mt-2 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rose-500" />
                    <span>{trip.duration_days} Days</span>
                  </span>
                  <span>&bull;</span>
                  <span className="capitalize">{trip.pace || 'Balanced'}</span>
                  <span>&bull;</span>
                  <span>{trip.itinerary?.length || 0} events</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Create Trip helper card */}
          <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-rose-200/80 text-center space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-display font-bold text-stone-900 text-sm">Dynamic AI Trip Generator</h4>
            <p className="text-xs text-stone-600 leading-relaxed font-normal">
              Initialize a trip entity with automated preference parsing, boutique hotel recommendations, and synchronized activities.
            </p>
            <button
              onClick={onOpenCreateTrip}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              Start New Plan
            </button>
          </div>
        </div>

        {/* Right Column: Central Entity Deep Inspector */}
        <div className="lg:col-span-8">
          {selectedTrip ? (
            <TripDetailView
              trip={selectedTrip}
              onRefreshTrip={refreshCurrentTrip}
              onOpenEditPreferences={onOpenEditPreferences}
            />
          ) : (
            <div className="p-12 text-center bg-white/95 backdrop-blur-xl rounded-3xl border border-stone-200 text-stone-500 space-y-3">
              <Compass className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-display text-lg font-bold text-stone-800">Select a Trip to Inspect Canvas</h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Explore traveler profiles, preference constraints, live schedules, bookings, alerts, and change history.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Trip Deletion Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-stone-900 font-display">
                Delete Trip Itinerary?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to delete this trip?
              </p>
              <p className="text-xs font-semibold text-stone-800 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                "{tripToDelete.title}" ({tripToDelete.duration_days} Days)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-full border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Trip</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
