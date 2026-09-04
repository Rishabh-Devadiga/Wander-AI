import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Zap, 
  DollarSign, 
  Building2, 
  Ticket, 
  History, 
  RefreshCw, 
  FileText, 
  Phone, 
  ShieldCheck, 
  ChevronRight, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  Send,
  ExternalLink
} from 'lucide-react';
import { Trip, ItineraryItem, Booking, ChangeHistory } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';

interface OperatorTripWorkspaceProps {
  trip: Trip;
  onBack: () => void;
  onTripUpdated: (updatedTrip: Trip) => void;
  onTriggerDisruptionDemo: () => void;
}

export const OperatorTripWorkspace: React.FC<OperatorTripWorkspaceProps> = ({
  trip,
  onBack,
  onTripUpdated,
  onTriggerDisruptionDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'bookings' | 'vendors' | 'history' | 'preview'>('itinerary');
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
  const [impactAnalysis, setImpactAnalysis] = useState<any | null>(null);
  const [replanOptions, setReplanOptions] = useState<any[]>([]);
  const [isLoadingReplan, setIsLoadingReplan] = useState(false);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>('alt-kayak-001');
  const [operatorNotes, setOperatorNotes] = useState<string>('Approved alternative based on traveler adventure preferences and verified immediate vendor capacity.');
  const [isApplyingReplan, setIsApplyingReplan] = useState(false);
  const [replanSuccessSummary, setReplanSuccessSummary] = useState<any | null>(null);

  // Check if trip has active unresolved disruption
  const activeCriticalAlert = trip.alerts?.find((a) => !a.is_resolved && (a.severity === 'critical' || a.severity === 'warning'));
  const hasGroundedItem = trip.itinerary?.some((i) => i.status === 'cancelled' || i.title?.toLowerCase().includes('paragliding') && trip.alerts?.some(a => !a.is_resolved));

  // Run impact analysis when disruption is detected
  const handleRunImpactAnalysis = async () => {
    setIsAnalyzingImpact(true);
    try {
      const res = await TourFlowApi.getImpactAnalysis(trip.id, {
        title: activeCriticalAlert?.title || 'Severe Alpine Wind Shear at Solang Valley',
        description: activeCriticalAlert?.description || '48 km/h wind shear grounding paragliding flights',
      });
      setImpactAnalysis(res);
      await handleFetchReplanOptions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  // Fetch AI Replan options from Gemini
  const handleFetchReplanOptions = async () => {
    setIsLoadingReplan(true);
    try {
      const res = await TourFlowApi.getAiReplanOptions(trip.id, {
        title: activeCriticalAlert?.title || 'Alpine Wind Shear Warning at Solang Valley',
        description: activeCriticalAlert?.description || 'Paragliding grounded due to high wind speeds',
      });
      if (res?.candidates) {
        setReplanOptions(res.candidates);
        if (res.candidates.length > 0) {
          setSelectedAlternativeId(res.candidates[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReplan(false);
    }
  };

  // Approve & Apply Replan
  const handleApproveReplan = async () => {
    if (!selectedAlternativeId) return;
    setIsApplyingReplan(true);
    try {
      const res = await TourFlowApi.applyReplan(trip.id, selectedAlternativeId, operatorNotes);
      if (res?.success && res?.trip) {
        onTripUpdated(res.trip);
        setReplanSuccessSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to apply replan', err);
    } finally {
      setIsApplyingReplan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start space-x-4">
          <button
            id="btn-back-to-dashboard"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                TOUR #{trip.id}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                trip.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                trip.status === 'confirmed' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {trip.status}
              </span>
              {activeCriticalAlert && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>ACTION REQUIRED</span>
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-white mt-1.5">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{trip.origin} → {trip.destination?.name}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{trip.traveler_count} Travelers ({trip.travel_type})</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{trip.formatted_dates} ({trip.duration_days} Days)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-simulate-disruption-workspace"
            onClick={onTriggerDisruptionDemo}
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Inject real-time wind shear disruption at Solang Valley"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Simulate Disruption</span>
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Package Total</div>
            <div className="font-bold text-emerald-400 font-mono text-sm">
              ₹{(trip.total_cost || trip.total_budget || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'itinerary', label: 'Interactive Itinerary & AI Replan', icon: Sparkles },
          { id: 'overview', label: 'Operations Overview', icon: FileText },
          { id: 'bookings', label: `Bookings (${trip.bookings?.length || 0})`, icon: Ticket },
          { id: 'vendors', label: 'Assigned Vendors', icon: Building2 },
          { id: 'history', label: `Audit Log (${trip.change_history?.length || 0})`, icon: History },
          { id: 'preview', label: 'Traveler View Live', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: ITINERARY & AI REPLAN */}
      {activeTab === 'itinerary' && (
        <div className="space-y-6">
          {/* Active Disruption Banner if Alert Present */}
          {(activeCriticalAlert || hasGroundedItem) && !replanSuccessSummary && (
            <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      INCIDENT IN PROGRESS: DAY 3 SOLANG VALLEY
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {activeCriticalAlert?.title || 'Severe Alpine Wind Shear Warning (48 km/h) at Solang Valley'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                    {activeCriticalAlert?.description || 'All tandem paragliding grounded by Himachal Tourism Authority. 4 passengers affected. Operational replanning is urgently recommended to protect guest experience.'}
                  </p>

                  {/* Impact Analysis & Replan Trigger Buttons */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      id="btn-run-impact-analysis"
                      onClick={handleRunImpactAnalysis}
                      disabled={isAnalyzingImpact}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
                    >
                      {isAnalyzingImpact ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-300" />
                      )}
                      <span>{impactAnalysis ? 'Re-run Impact Analysis' : 'Run Disruption Impact Analysis & AI Replan'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replan Success Announcement Banner */}
          {replanSuccessSummary && (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-5 shadow-xl text-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>AI Replan Successfully Executed & Synchronized Across Platform!</span>
              </div>
              <p className="text-slate-300">
                The canonical itinerary, central bookings, package ledger, and traveler notifications have all been updated immediately in the shared database.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400 text-[10px]">NEW CONFIRMED ACTIVITY</div>
                  <div className="text-white font-bold text-xs mt-0.5">{replanSuccessSummary.new_activity}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400 text-[10px]">BOOKING VOUCHER REF</div>
                  <div className="text-emerald-400 font-mono font-bold text-xs mt-0.5">{replanSuccessSummary.booking_reference}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400 text-[10px]">PACKAGE SAVINGS / REFUND</div>
                  <div className="text-white font-bold text-xs mt-0.5">₹{replanSuccessSummary.cost_savings.toLocaleString()} Adjusted</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400 text-[10px]">TRAVELER DISPATCH</div>
                  <div className="text-sky-400 font-semibold text-xs mt-0.5">SMS & App Push Sent</div>
                </div>
              </div>
            </div>
          )}

          {/* Impact Analysis Details Card */}
          {impactAnalysis && !replanSuccessSummary && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Automated Disruption Impact Report
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Calculated at {new Date().toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Affected Travelers</div>
                  <div className="text-lg font-bold text-white mt-0.5">{impactAnalysis.affected_travelers} Pax</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Unfulfilled Value</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">₹{impactAnalysis.financial_exposure.unfulfilled_booking_cost.toLocaleString()}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Time Window Affected</div>
                  <div className="text-xs font-bold text-slate-200 mt-1">{impactAnalysis.time_window_affected.start_time} – {impactAnalysis.time_window_affected.end_time}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Safety Risk Level</div>
                  <div className="text-xs font-bold text-rose-400 mt-1 uppercase">{impactAnalysis.safety_risk_level} (High Winds)</div>
                </div>
              </div>

              {/* Gemini AI Ranked Alternatives */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>Ranked AI Replanning Candidates (Gemini Engine)</span>
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-medium">All vendors capacity-verified</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {replanOptions.map((alt) => {
                    const isSelected = selectedAlternativeId === alt.id;
                    return (
                      <div
                        key={alt.id}
                        onClick={() => setSelectedAlternativeId(alt.id)}
                        className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {alt.match_score}% Match
                            </span>
                            <span className="text-xs font-mono font-bold text-white">
                              ₹{alt.total_price.toLocaleString()}
                            </span>
                          </div>

                          <h5 className="font-bold text-white text-sm">{alt.title}</h5>
                          <p className="text-xs text-slate-400 line-clamp-3">{alt.description}</p>

                          <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                            <div>Vendor: <strong className="text-slate-300">{alt.vendor_name}</strong></div>
                            <div>Window: <strong className="text-slate-300">{alt.start_time} – {alt.end_time}</strong></div>
                            <div>Location: <strong className="text-slate-300">{alt.location}</strong></div>
                          </div>
                        </div>

                        <div className="mt-4 pt-2 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 text-[11px]">Instant Allotment</span>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-700 text-transparent'
                          }`}>
                            <Check className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Operator Approval Note & Execution Form */}
                <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Operator Replan Justification & Dispatch Notes
                    </label>
                    <input
                      type="text"
                      value={operatorNotes}
                      onChange={(e) => setOperatorNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Enter operator approval notes..."
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-1">
                    <button
                      id="btn-approve-and-execute-replan"
                      onClick={handleApproveReplan}
                      disabled={isApplyingReplan || !selectedAlternativeId}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 transition-all disabled:opacity-50"
                    >
                      {isApplyingReplan ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      )}
                      <span>Approve & Dispatch AI Replan to Traveler</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Day-by-Day Canonical Itinerary View */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Tour Schedule & Milestone Timeline</h3>
              <span className="text-xs text-slate-400">5 Days • 11 Verified Allotments</span>
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((dayNum) => {
                const dayItems = (trip.itinerary || []).filter((i) => i.day_number === dayNum);
                return (
                  <div key={dayNum} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
                          {dayNum}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {dayNum === 1 ? 'Arrival & Mountain Ascent to Manali' :
                           dayNum === 2 ? 'Hadimba Forest & Rohtang Snow Point' :
                           dayNum === 3 ? 'Solang Valley Adventure Day' :
                           dayNum === 4 ? 'Naggar Castle & Heritage Culture' :
                           'Departure Descent to Chandigarh'}
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {dayItems.length} activities
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayItems.map((item) => {
                        const isGrounded = item.status === 'cancelled' || (item.title?.toLowerCase().includes('paragliding') && trip.alerts?.some(a => !a.is_resolved));

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isGrounded
                                ? 'bg-rose-950/30 border-rose-500/50'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  item.item_type === 'hotel' ? 'bg-indigo-500/20 text-indigo-300' :
                                  item.item_type === 'transport' ? 'bg-sky-500/20 text-sky-300' :
                                  'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {item.item_type}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">{item.start_time || 'All Day'}</span>
                                {isGrounded && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                                    GROUNDED / CANCELLED
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-white">{item.title}</div>
                              {item.description && (
                                <p className="text-[11px] text-slate-400">{item.description}</p>
                              )}
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 text-xs">
                              <span className="font-mono font-bold text-white">
                                {item.cost ? `₹${item.cost.toLocaleString()}` : 'Included'}
                              </span>
                              <span className={`text-[10px] font-medium capitalize ${
                                isGrounded ? 'text-rose-400 font-bold' : 'text-emerald-400'
                              }`}>
                                {item.status || 'Confirmed'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OPERATIONS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Flight & Chauffeur Logistics</h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Inbound Flight</div>
                <div className="font-bold text-white text-sm mt-0.5">IndiGo 6E-512 (BOM → IXC)</div>
                <div className="text-emerald-400 mt-1">Confirmed on-time • 4 passengers</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Assigned Mountain Chauffeur</div>
                <div className="font-bold text-white text-sm mt-0.5">Toyota Fortuner 4x4 (HP-01-A-8841)</div>
                <div className="text-slate-300 mt-1">Driver: Rajinder Verma (+91 98160 44219)</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hospitality & Emergency Desk</h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Resort Reservation</div>
                <div className="font-bold text-white text-sm mt-0.5">The Himalayan Luxury Castle & Spa</div>
                <div className="text-slate-300 mt-1">2 Victorian Balcony Chambers • Front Desk: (+91 1902 250123)</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Himalayan Trails 24/7 Operations Desk</div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">Duty Officer: Rajesh Sharma</div>
                <div className="text-slate-300 mt-1">Emergency Hotline: (+91 1902 258800)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BOOKINGS & ALLOTMENTS */}
      {activeTab === 'bookings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Central Vouchers & Allotments</h3>
              <p className="text-xs text-slate-400">Direct integration with partner reservation ledgers</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{trip.bookings?.length || 0} Bookings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Voucher Ref</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Vendor / Service</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(trip.bookings || []).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{b.booking_reference}</td>
                    <td className="px-5 py-3.5 uppercase text-[11px] font-semibold text-slate-400">{b.item_type}</td>
                    <td className="px-5 py-3.5 font-medium text-white">{b.vendor_id}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white">₹{b.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' :
                        b.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-emerald-400 font-semibold uppercase text-[10px]">{b.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VENDORS */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'The Himalayan Luxury Castle', category: 'Hotel Resort', rating: 4.9, phone: '+91 1902 250123', contact: 'Manali Hadimba Road' },
            { name: 'Kullu Mountain 4x4 Chauffeurs', category: 'Transport', rating: 4.85, phone: '+91 98160 44219', contact: 'Rajinder Verma (Fleet Lead)' },
            { name: 'Himalayan Rapids Kayaking Co.', category: 'Adventure Activities', rating: 4.95, phone: '+91 98160 77124', contact: 'Capt. Sunil Negi' },
            { name: 'IndiGo Airlines Partner Desk', category: 'Flights', rating: 4.8, phone: '1800 180 1407', contact: 'Priority Agent Terminal' },
          ].map((v, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {v.category}
                </span>
                <h4 className="font-bold text-white text-sm mt-1">{v.name}</h4>
                <div className="text-xs text-slate-400 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{v.phone} • {v.contact}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-amber-400 font-mono">★ {v.rating}</div>
                <span className="text-[10px] text-emerald-400 font-medium">SLA Verified</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: CHANGE HISTORY AUDIT */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Canonical Audit Log</h3>
            <span className="text-xs text-slate-400">PostgreSQL Immutable History</span>
          </div>

          <div className="space-y-3">
            {(trip.change_history || []).map((chg) => (
              <div key={chg.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-400 capitalize">{chg.action.replace('_', ' ')}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{new Date(chg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-slate-300">
                  By: <strong className="text-white capitalize">{chg.changed_by}</strong> • Field: <code className="text-amber-300 font-mono">{chg.field_changed}</code>
                </div>
                {chg.reason && (
                  <p className="text-slate-400 italic text-[11px]">"{chg.reason}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRAVELER PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Live Traveler Screen Synchronization</h3>
              <p className="text-xs text-slate-400">This exact canonical trip state is rendered to the traveler's device.</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Linked</span>
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase">Traveler Portal View</span>
                <h4 className="text-lg font-bold text-white">{trip.title}</h4>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Package Total</div>
                <div className="text-sm font-bold text-white font-mono">₹{(trip.total_cost || trip.total_budget || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Notifications shown to traveler */}
            {trip.notifications && trip.notifications.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">Traveler Notifications:</div>
                {trip.notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-0.5">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
