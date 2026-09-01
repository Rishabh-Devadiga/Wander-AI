import React, { useState, useEffect, useCallback } from 'react';
import { OperatorLogin } from './OperatorLogin';
import { OperatorHeader } from './OperatorHeader';
import { OperatorSidebar, OperatorNavTab } from './OperatorSidebar';
import { OperatorDashboard } from './OperatorDashboard';
import { OperatorTripWorkspace } from './OperatorTripWorkspace';
import { OperatorTripRequests } from './OperatorTripRequests';
import { OperatorItineraries } from './OperatorItineraries';
import { OperatorHotels } from './OperatorHotels';
import { OperatorTransport } from './OperatorTransport';
import { OperatorVendors } from './OperatorVendors';
import { OperatorBookings } from './OperatorBookings';
import { OperatorAlerts } from './OperatorAlerts';
import { OperatorAiAssistant } from './OperatorAiAssistant';
import { OperatorAnalytics } from './OperatorAnalytics';
import { TourFlowApi } from '../../services/api';
import { Trip } from '../../types/tourflow';

interface OperatorPortalProps {
  onSwitchToTraveler: () => void;
}

export const OperatorPortal: React.FC<OperatorPortalProps> = ({ onSwitchToTraveler }) => {
  const [operatorUser, setOperatorUser] = useState<{
    email: string;
    name: string;
    role: string;
    operator_name: string;
  } | null>(() => {
    // Check localStorage or default to logged-in demo state
    const saved = localStorage.getItem('tourflow_operator_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return {
      email: 'operator@tourflow.ai',
      name: 'Rajesh Sharma',
      role: 'operator',
      operator_name: 'Himalayan Trails Tour Operations',
    };
  });

  const [currentTab, setCurrentTab] = useState<OperatorNavTab>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [lastVersion, setLastVersion] = useState<number>(0);

  // Fetch all operator data
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [dash, tripsList, vends, bkgs, alrts, analytics] = await Promise.all([
        TourFlowApi.getOperatorDashboard(),
        TourFlowApi.getTrips(),
        TourFlowApi.getOperatorVendors(),
        TourFlowApi.getOperatorBookings(),
        TourFlowApi.getOperatorAlerts(),
        TourFlowApi.getOperatorAnalytics(),
      ]);

      if (dash) setDashboardData(dash);
      if (tripsList) setAllTrips(tripsList);
      if (vends) setVendors(vends);
      if (bkgs) setBookings(bkgs);
      if (alrts) setAlerts(alrts);
      if (analytics) setAnalyticsData(analytics);

      // If a trip is selected, refresh its details
      if (selectedTripId) {
        const t = await TourFlowApi.getTrip(selectedTripId);
        if (t) setSelectedTrip(t);
      }

      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Operator sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedTripId]);

  // Initial load
  useEffect(() => {
    if (operatorUser) {
      fetchAllData();
    }
  }, [operatorUser, fetchAllData]);

  // Real-time synchronization polling loop (every 3 seconds)
  useEffect(() => {
    if (!operatorUser) return;

    const interval = setInterval(async () => {
      try {
        const syncMeta = await TourFlowApi.getSyncVersion();
        if (syncMeta && syncMeta.version !== lastVersion) {
          setLastVersion(syncMeta.version);
          fetchAllData();
        }
      } catch (err) {
        // quiet fallback
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [operatorUser, lastVersion, fetchAllData]);

  // When selectedTripId changes, fetch trip
  useEffect(() => {
    if (selectedTripId) {
      TourFlowApi.getTrip(selectedTripId).then((t) => {
        if (t) setSelectedTrip(t);
      });
    } else {
      setSelectedTrip(null);
    }
  }, [selectedTripId]);

  const handleLoginSuccess = (user: { email: string; name: string; role: string; operator_name: string }) => {
    localStorage.setItem('tourflow_operator_user', JSON.stringify(user));
    setOperatorUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('tourflow_operator_user');
    setOperatorUser(null);
  };

  // Disruption Simulation Handler
  const handleTriggerDisruptionDemo = async () => {
    try {
      const res = await TourFlowApi.triggerDisruption('1024');
      if (res?.trip) {
        setSelectedTripId('1024');
        setSelectedTrip(res.trip);
        fetchAllData();
      }
    } catch (err) {
      console.error('Disruption trigger error', err);
    }
  };

  const handleAcceptTripRequest = async (tripId: string) => {
    try {
      await TourFlowApi.acceptTripRequest(tripId);
      fetchAllData();
    } catch (err) {
      console.error('Accept request error', err);
    }
  };

  const handleDeclineTripRequest = async (tripId: string) => {
    try {
      await TourFlowApi.declineTripRequest(tripId);
      fetchAllData();
    } catch (err) {
      console.error('Decline request error', err);
    }
  };

  const handleToggleVendor = async (vendorId: string) => {
    try {
      await TourFlowApi.toggleVendor(vendorId);
      const v = await TourFlowApi.getOperatorVendors();
      setVendors(v);
    } catch (err) {
      console.error('Vendor toggle error', err);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel' | 'rebook') => {
    try {
      await TourFlowApi.updateBookingAction(bookingId, action);
      fetchAllData();
    } catch (err) {
      console.error('Booking action error', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await TourFlowApi.resolveAlert(alertId);
      fetchAllData();
    } catch (err) {
      console.error('Resolve alert error', err);
    }
  };

  if (!operatorUser) {
    return (
      <OperatorLogin
        onLoginSuccess={handleLoginSuccess}
        onSwitchToTraveler={onSwitchToTraveler}
      />
    );
  }

  const unresolvedAlertCount = (alerts || []).filter((a) => !a.is_resolved).length;
  const activeToursCount = (allTrips || []).filter((t) => ['ongoing', 'confirmed'].includes(t.status) && t.id !== 'trp-manali-alpine-demo-001').length;
  const pendingRequestsCount = (allTrips || []).filter((t) => t.status === 'planning').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <OperatorHeader
        operatorUser={operatorUser}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onManualSync={fetchAllData}
        onTriggerDisruptionDemo={handleTriggerDisruptionDemo}
        onSwitchToTraveler={onSwitchToTraveler}
        onLogout={handleLogout}
        unresolvedAlertCount={unresolvedAlertCount}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <OperatorSidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedTripId(null);
          }}
          unresolvedAlertCount={unresolvedAlertCount}
          activeToursCount={activeToursCount}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl">
          {/* If viewing a single trip workspace */}
          {selectedTrip ? (
            <OperatorTripWorkspace
              trip={selectedTrip}
              onBack={() => {
                setSelectedTripId(null);
                setSelectedTrip(null);
              }}
              onTripUpdated={(updated) => {
                setSelectedTrip(updated);
                fetchAllData();
              }}
              onTriggerDisruptionDemo={handleTriggerDisruptionDemo}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <OperatorDashboard
                  kpis={
                    dashboardData?.kpis || {
                      active_tours: 4,
                      travelers_on_ground: 22,
                      today_activities: 14,
                      urgent_issues: unresolvedAlertCount,
                      upcoming_trips: pendingRequestsCount,
                      total_revenue: 943400,
                    }
                  }
                  priorityAlerts={dashboardData?.priority_alerts || []}
                  activeTours={dashboardData?.active_tours_table || []}
                  allTrips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                  onTriggerDisruptionDemo={handleTriggerDisruptionDemo}
                  onAcceptTripRequest={handleAcceptTripRequest}
                  onDeclineTripRequest={handleDeclineTripRequest}
                  onOpenReplanForTrip={(id) => {
                    setSelectedTripId(id);
                  }}
                />
              )}

              {currentTab === 'trip_requests' && (
                <OperatorTripRequests
                  trips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                  onAcceptTripRequest={handleAcceptTripRequest}
                  onDeclineTripRequest={handleDeclineTripRequest}
                />
              )}

              {currentTab === 'active_tours' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">Active & On-Ground Tours</h1>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Comprehensive manifest of all active traveler groups, live timelines, and partner assignments.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allTrips
                      .filter((t) => ['ongoing', 'confirmed'].includes(t.status) && t.id !== 'trp-manali-alpine-demo-001')
                      .map((t) => (
                        <div
                          key={t.id}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-sky-400">#{t.id}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                  t.status === 'ongoing'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-white">{t.title}</h3>

                            <div className="text-xs text-slate-400 space-y-1">
                              <div>Route: <strong className="text-slate-200">{t.origin || 'Origin'} → {t.destination?.name}</strong></div>
                              <div>Dates: <strong className="text-slate-200">{t.formatted_dates}</strong> ({t.duration_days} Days)</div>
                              <div>Travelers: <strong className="text-slate-200">{t.traveler_count} ({t.travel_type})</strong></div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                            <div className="font-bold text-emerald-400 font-mono text-sm">
                              ₹{(t.total_cost || t.total_budget || 0).toLocaleString()}
                            </div>

                            <button
                              id={`btn-manage-tour-${t.id}`}
                              onClick={() => setSelectedTripId(t.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                            >
                              Open Tour Center
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {currentTab === 'itineraries' && (
                <OperatorItineraries
                  trips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                  onOpenReplanForTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'bookings' && (
                <OperatorBookings
                  bookings={bookings}
                  onBookingAction={handleBookingAction}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'hotels' && (
                <OperatorHotels
                  trips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'transport' && (
                <OperatorTransport
                  trips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'vendors' && (
                <OperatorVendors
                  vendors={vendors}
                  onToggleVendor={handleToggleVendor}
                />
              )}

              {currentTab === 'alerts' && (
                <OperatorAlerts
                  alerts={alerts}
                  onResolveAlert={handleResolveAlert}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'ai_assistant' && (
                <OperatorAiAssistant
                  trips={allTrips}
                  onSelectTrip={(id) => setSelectedTripId(id)}
                />
              )}

              {currentTab === 'analytics' && (
                <OperatorAnalytics analyticsData={analyticsData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
