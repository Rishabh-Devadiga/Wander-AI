import React, { useState, FormEvent } from 'react';
import { 
  Calendar, MapPin, DollarSign, Clock, Users, ShieldAlert, 
  Bell, History, Star, RefreshCw, CheckCircle2, ChevronRight,
  Sliders, Plus, AlertTriangle, ArrowRight, Bed, Mountain, Car, Sparkles,
  Luggage, Share2, Printer, CheckSquare, Square, Calculator, MessageCircle,
  Map as MapIcon, Trash2
} from 'lucide-react';
import { Trip } from '../types/tourflow';
import { TourFlowApi } from '../services/api';
import { useTripStore } from '../store/useTripStore';
import { TripInteractiveMap } from './TripInteractiveMap';

interface TripDetailViewProps {
  trip: Trip;
  onRefreshTrip: () => void;
  onOpenEditPreferences: (trip: Trip) => void;
}

export default function TripDetailView({ trip, onRefreshTrip, onOpenEditPreferences }: TripDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'packing' | 'split' | 'preferences' | 'bookings' | 'alerts' | 'history' | 'reviews'>('itinerary');
  const [triggeringReplan, setTriggeringReplan] = useState(false);
  const [replanSuccessMessage, setReplanSuccessMessage] = useState<string | null>(null);
  const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const deleteItinerary = useTripStore((state) => state.deleteItinerary);
  const deleteItineraryItem = useTripStore((state) => state.deleteItineraryItem);

  // Packing Checklist state
  const defaultPackingItems = [
    { id: 'p1', category: 'Clothing & Layers', text: 'Breathable cotton & thermal inner layers', checked: true },
    { id: 'p2', category: 'Clothing & Layers', text: 'Windproof light jacket / fleece hoodie', checked: true },
    { id: 'p3', category: 'Clothing & Layers', text: 'Comfortable trail walking shoes / sneakers', checked: false },
    { id: 'p4', category: 'Essentials & Tech', text: 'Government ID (Aadhaar / Passport) & Hotel Vouchers', checked: true },
    { id: 'p5', category: 'Essentials & Tech', text: 'Power bank (10,000mAh+) & Universal charger', checked: false },
    { id: 'p6', category: 'Health & Wellness', text: 'High SPF sunscreen, lip balm & insect repellent', checked: false },
    { id: 'p7', category: 'Health & Wellness', text: 'Personal medical kit (anti-altitude, ORS, band-aids)', checked: true },
    { id: 'p8', category: 'Specialized Gear', text: 'Sunglasses with UV400 protection & daypack', checked: false },
  ];
  const [packingItems, setPackingItems] = useState(defaultPackingItems);
  const [newPackingText, setNewPackingText] = useState('');

  // Expense Splitter state
  const [expenses, setExpenses] = useState([
    { id: 'e1', title: 'Hotel Booking Deposit', amount: Math.round(trip.total_budget * 0.45), paidBy: 'Traveler 1' },
    { id: 'e2', title: 'Chauffeur / Transit Cabs', amount: Math.round(trip.total_budget * 0.25), paidBy: 'Traveler 2' },
    { id: 'e3', title: 'Activities & Guide Passes', amount: Math.round(trip.total_budget * 0.18), paidBy: 'Traveler 1' },
  ]);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  const [copiedShare, setCopiedShare] = useState(false);

  const handleTestDisruptionReplan = async () => {
    setTriggeringReplan(true);
    setReplanSuccessMessage(null);
    try {
      await TourFlowApi.aiReplan(trip.id, {
        type: 'weather_alert',
        severity: 'warning',
        title: 'Alpine Snowstorm Advisory at Solang Valley',
        description: 'Heavy snowfall detected. Autonomous dynamic replanner generated indoor and low-altitude alternatives.'
      });
      setReplanSuccessMessage('Dynamic Replan Alert successfully injected and logged into Change History!');
      onRefreshTrip();
    } catch (err: any) {
      alert(`Replanning failed: ${err.message}`);
    } finally {
      setTriggeringReplan(false);
    }
  };

  const togglePackingItem = (id: string) => {
    setPackingItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const addPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackingText.trim()) return;
    setPackingItems(prev => [
      ...prev,
      { id: `p-${Date.now()}`, category: 'Custom Items', text: newPackingText.trim(), checked: false }
    ]);
    setNewPackingText('');
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newExpAmount);
    if (!newExpTitle.trim() || isNaN(val) || val <= 0) return;
    setExpenses(prev => [
      ...prev,
      { id: `e-${Date.now()}`, title: newExpTitle.trim(), amount: val, paidBy: `Traveler ${(prev.length % trip.traveler_count) + 1}` }
    ]);
    setNewExpTitle('');
    setNewExpAmount('');
  };

  const totalExpenseSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const costPerPerson = trip.traveler_count > 0 ? Math.round(totalExpenseSum / trip.traveler_count) : totalExpenseSum;

  const handleShareTrip = () => {
    const itinerarySummary = trip.itinerary
      ?.map(i => `• Day ${i.day_number}: ${i.title} (${i.start_time || 'Flexible'})`)
      .join('\n') || 'Itinerary generated via WonderAi';

    const shareText = `🌟 *${trip.title}*\n📍 Duration: ${trip.duration_days} Days\n💰 Budget: ₹${trip.total_budget?.toLocaleString()}\n👥 Travelers: ${trip.traveler_count}\n\n*Schedule Highlights:*\n${itinerarySummary}\n\nPlanned with WonderAi ✨`;

    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const handlePrintTrip = () => {
    window.print();
  };

  return (
    <div id="trip-detail-central-entity-container" className="space-y-6">
      
      {/* Trip Header Banner - Layla Rounded Card */}
      <div id="trip-header-card" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                trip.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {trip.status}
              </span>
              <span className="text-[11px] text-stone-400 font-semibold">Trip ID: {trip.id}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-stone-900">{trip.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Share & Print Quick Actions */}
            <button
              onClick={handleShareTrip}
              className="px-3.5 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy itinerary summary to share"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span>{copiedShare ? 'Copied to Clipboard! ✓' : 'Share Itinerary'}</span>
            </button>

            <button
              onClick={handlePrintTrip}
              className="p-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer hidden sm:flex items-center justify-center"
              title="Print or Export PDF"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
            </button>

            <button
              id="test-ai-replan-btn"
              onClick={handleTestDisruptionReplan}
              disabled={triggeringReplan}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{triggeringReplan ? 'Replanning...' : 'Trigger Replan ❄️'}</span>
            </button>

            <button
              id="edit-trip-preferences-btn"
              onClick={() => onOpenEditPreferences(trip)}
              className="px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              <span>Edit Preferences</span>
            </button>

            <button
              id="refresh-trip-btn"
              onClick={onRefreshTrip}
              title="Refresh Trip Data"
              className="p-2.5 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              id="delete-trip-header-btn"
              onClick={() => setShowDeleteTripModal(true)}
              className="px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete Trip Itinerary"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Trip</span>
            </button>
          </div>
        </div>

        {replanSuccessMessage && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{replanSuccessMessage}</span>
          </div>
        )}

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-stone-100">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Duration</p>
              <p className="font-bold text-stone-800">{trip.duration_days} Days</p>
            </div>
          </div>

          <div 
            onClick={() => onOpenEditPreferences(trip)}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-stone-100 hover:border-purple-300 hover:bg-purple-50/40 cursor-pointer transition-all group"
            title="Click to adjust trip budget and preferences"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-50 group-hover:bg-purple-100 flex items-center justify-center text-orange-500 group-hover:text-purple-600 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>Budget</span>
                <span className="text-[9px] text-[#7065F0] underline font-semibold">Adjust</span>
              </p>
              <p className="font-bold text-stone-800">₹{trip.total_budget?.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-stone-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Travelers</p>
              <p className="font-bold text-stone-800">{trip.traveler_count} ({trip.preferences?.travel_companions || 'couple'})</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-stone-100">
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Pace</p>
              <p className="font-bold text-stone-800 capitalize">{trip.pace || 'Balanced'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Central Entity Layla Pill Tabs */}
      <div id="central-entity-subnav" className="flex items-center gap-2 p-1.5 rounded-full bg-stone-200/60 overflow-x-auto no-scrollbar">
        <button
          id="tab-itinerary-btn"
          onClick={() => setActiveTab('itinerary')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'itinerary'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Itinerary Schedule</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'itinerary' ? 'bg-rose-100 text-rose-700' : 'bg-stone-300 text-stone-700'
          }`}>{trip.itinerary?.length || 0}</span>
        </button>

        <button
          id="tab-packing-btn"
          onClick={() => setActiveTab('packing')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'packing'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Luggage className="w-3.5 h-3.5 text-rose-500" />
          <span>Smart Packing List</span>
          <span className="px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
            {packingItems.filter(p => p.checked).length}/{packingItems.length}
          </span>
        </button>

        <button
          id="tab-split-btn"
          onClick={() => setActiveTab('split')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'split'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          <span>Expense Splitter (₹)</span>
        </button>

        <button
          id="tab-preferences-btn"
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-stone-500" />
          <span>Preferences</span>
        </button>

        <button
          id="tab-bookings-btn"
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Bookings</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'bookings' ? 'bg-rose-100 text-rose-700' : 'bg-stone-300 text-stone-700'
          }`}>{trip.bookings?.length || 0}</span>
        </button>

        <button
          id="tab-alerts-btn"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Alerts</span>
          <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{trip.alerts?.length || 0}</span>
        </button>

        <button
          id="tab-history-btn"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-stone-500" />
          <span>Audit History</span>
        </button>

        <button
          id="tab-reviews-btn"
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'reviews'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span>Reviews</span>
        </button>
      </div>

      {/* Tab Panels */}

      {/* 1. Itinerary Items with Transit Connectors */}
      {activeTab === 'itinerary' && (
        <div id="panel-itinerary" className="space-y-6">
          {(!trip.itinerary || trip.itinerary.length === 0) ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 text-sm">
              No itinerary items generated yet.
            </div>
          ) : (
            // Group by day_number
            [...new Set(trip.itinerary.map(i => i.day_number))].sort((a, b) => a - b).map(dayNum => {
              const dayItems = trip.itinerary
                .filter(i => i.day_number === dayNum)
                .sort((a, b) => a.order_index - b.order_index);

              return (
                <div key={dayNum} className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                        {dayNum}
                      </span>
                      <span>Day {dayNum} Plan</span>
                    </h3>
                    <span className="text-xs text-stone-400 font-semibold">{dayItems.length} Events</span>
                  </div>

                  <div className="space-y-3">
                    {dayItems.map((item, idx) => (
                      <div key={item.id} className="space-y-3">
                        <div
                          id={`itinerary-item-${item.id}`}
                          className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-rose-500 shrink-0 shadow-2xs">
                              {item.item_type === 'hotel' ? (
                                <Bed className="w-4 h-4" />
                              ) : item.item_type === 'transport' ? (
                                <Car className="w-4 h-4" />
                              ) : (
                                <Mountain className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-900">{item.title}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                  item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{item.description}</p>
                              {item.location && (
                                <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-rose-400" />
                                  <span>{item.location}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="sm:text-right">
                              <div className="text-xs font-bold text-stone-700">
                                {item.start_time || 'Flexible'} {item.end_time ? `- ${item.end_time}` : ''}
                              </div>
                              {item.cost > 0 && (
                                <div className="text-xs text-rose-600 font-extrabold mt-0.5">
                                  ₹{item.cost.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingItemId(item.id);
                                deleteItineraryItem(item.day_number, item.id, item.title);
                                setTimeout(() => {
                                  onRefreshTrip();
                                  setDeletingItemId(null);
                                }, 250);
                              }}
                              disabled={deletingItemId === item.id}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                              title={`Delete ${item.item_type === 'hotel' ? 'Hotel' : item.item_type === 'transport' ? 'Transport' : 'Activity'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Visual Transit Leg between events */}
                        {idx < dayItems.length - 1 && (
                          <div className="flex items-center gap-2 pl-6 py-0.5 text-[11px] text-stone-400 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            <Car className="w-3 h-3 text-stone-400" />
                            <span>15-25 min scenic drive via verified cab</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Smart Packing List */}
      {activeTab === 'packing' && (
        <div id="panel-packing" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
                <Luggage className="w-5 h-5 text-rose-500" />
                <span>Smart Baggage Packing Checklist</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                AI customized checklist matched to your destination climate & duration.
              </p>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              {packingItems.filter(p => p.checked).length} of {packingItems.length} items packed ({Math.round((packingItems.filter(p => p.checked).length / packingItems.length) * 100)}%)
            </div>
          </div>

          {/* Add custom item */}
          <form onSubmit={addPackingItem} className="flex gap-2">
            <input
              type="text"
              value={newPackingText}
              onChange={(e) => setNewPackingText(e.target.value)}
              placeholder="Add custom packing item (e.g. Camera tripod, drone, thermal socks)..."
              className="flex-1 px-4 py-2 rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-[#FAF8F5]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-2xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Add Item
            </button>
          </form>

          {/* Checklist Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packingItems.map(item => (
              <div
                key={item.id}
                onClick={() => togglePackingItem(item.id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                  item.checked
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-[#FAF8F5] border-stone-200 text-stone-800 hover:border-rose-300'
                }`}
              >
                <div className="shrink-0">
                  {item.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <span className={`font-semibold ${item.checked ? 'line-through opacity-75' : ''}`}>
                    {item.text}
                  </span>
                  <span className="block text-[10px] text-stone-400">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Expense Splitter */}
      {activeTab === 'split' && (
        <div id="panel-split" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <span>Group Cost & Expense Splitter (₹ INR)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically divides shared transport, stays, and activity costs equally across {trip.traveler_count} travelers.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Per Person Share</span>
              <span className="font-extrabold text-emerald-900 text-base">₹{costPerPerson.toLocaleString()}</span>
            </div>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={addExpense} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newExpTitle}
              onChange={(e) => setNewExpTitle(e.target.value)}
              placeholder="Expense title (e.g. Dinner in Old Manali)..."
              className="px-4 py-2 rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-[#FAF8F5]"
            />
            <input
              type="number"
              value={newExpAmount}
              onChange={(e) => setNewExpAmount(e.target.value)}
              placeholder="Amount in ₹ INR..."
              className="px-4 py-2 rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-[#FAF8F5]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Add Expense
            </button>
          </form>

          {/* Expense Table */}
          <div className="space-y-2">
            {expenses.map(exp => (
              <div key={exp.id} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-800">{exp.title}</span>
                  <span className="text-stone-400 block text-[10px]">Paid by {exp.paidBy}</span>
                </div>
                <div className="font-extrabold text-stone-900 text-sm">
                  ₹{exp.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="font-bold text-stone-600">Total Group Spend Logged</span>
            <span className="font-black text-stone-900 text-base">₹{totalExpenseSum.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 4. Preferences & Constraints */}
      {activeTab === 'preferences' && (
        <div id="panel-preferences" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-stone-900">Trip Preferences (TripPreference Entity)</h3>
            <button
              onClick={() => onOpenEditPreferences(trip)}
              className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Update Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70">
              <span className="text-stone-400 uppercase tracking-wider text-[10px] font-extrabold block mb-1">Budget Tier</span>
              <span className="text-sm font-bold text-stone-800 capitalize">{trip.preferences?.budget_tier || 'Moderate'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70">
              <span className="text-stone-400 uppercase tracking-wider text-[10px] font-extrabold block mb-1">Travel Companions</span>
              <span className="text-sm font-bold text-stone-800 capitalize">{trip.preferences?.travel_companions || 'Couple'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 sm:col-span-2">
              <span className="text-stone-400 uppercase tracking-wider text-[10px] font-extrabold block mb-2">Interests & Focus</span>
              <div className="flex flex-wrap gap-1.5">
                {trip.preferences?.interests && trip.preferences.interests.length > 0 ? (
                  trip.preferences.interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold capitalize text-xs">
                      {interest.replace('_', ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-500">General exploration</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 sm:col-span-2">
              <span className="text-stone-400 uppercase tracking-wider text-[10px] font-extrabold block mb-1">Special Requests & Custom Instructions</span>
              <p className="text-stone-700 leading-relaxed">
                {trip.preferences?.special_requests || 'No special requests specified.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bookings */}
      {activeTab === 'bookings' && (
        <div id="panel-bookings" className="space-y-4">
          {(!trip.bookings || trip.bookings.length === 0) ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 text-sm">
              No vendor bookings linked yet.
            </div>
          ) : (
            trip.bookings.map(bkg => (
              <div key={bkg.id} className="p-5 rounded-3xl bg-white border border-stone-200/80 flex items-center justify-between text-xs shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-sm">{bkg.booking_reference}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase text-[10px]">
                      {bkg.status}
                    </span>
                  </div>
                  <p className="text-stone-500 mt-1 capitalize font-medium">Item Type: {bkg.item_type} &bull; Payment: {bkg.payment_status}</p>
                </div>
                <div className="text-right font-extrabold text-stone-900 text-base">
                  ₹{bkg.amount?.toLocaleString()} <span className="text-xs text-stone-400">{bkg.currency}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. Disruption Alerts */}
      {activeTab === 'alerts' && (
        <div id="panel-alerts" className="space-y-3">
          {(!trip.alerts || trip.alerts.length === 0) ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 text-sm">
              No active disruption alerts. All routes and bookings operating normally.
            </div>
          ) : (
            trip.alerts.map(alt => (
              <div key={alt.id} className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{alt.title}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-extrabold uppercase text-[10px]">
                    {alt.severity}
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed">{alt.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 7. Audit History */}
      {activeTab === 'history' && (
        <div id="panel-history" className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-display text-base font-bold text-stone-900">Change History & AI Action Audit Trail</h3>
          {(!trip.change_history || trip.change_history.length === 0) ? (
            <p className="text-stone-500 text-xs">No change history entries recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {trip.change_history.map(chg => (
                <div key={chg.id} className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/70 text-xs flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    chg.changed_by === 'ai' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-800'
                  }`}>
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 capitalize">{chg.action.replace('_', ' ')}</span>
                      <span className="text-[10px] text-stone-400 font-semibold">{new Date(chg.timestamp).toLocaleString()}</span>
                    </div>
                    {chg.reason && <p className="text-stone-600 mt-0.5 leading-relaxed">{chg.reason}</p>}
                    <div className="text-[11px] text-stone-400 mt-1 font-medium">
                      Actor: <span className="font-bold text-stone-700 uppercase">{chg.changed_by}</span>
                      {chg.field_changed && ` • Field: ${chg.field_changed}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. Reviews */}
      {activeTab === 'reviews' && (
        <div id="panel-reviews" className="space-y-3">
          {(!trip.reviews || trip.reviews.length === 0) ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 text-sm">
              No traveler reviews submitted for this trip yet.
            </div>
          ) : (
            trip.reviews.map(rev => (
              <div key={rev.id} className="p-6 rounded-3xl bg-white border border-stone-200/80 text-xs space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{rev.title}</span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{rev.rating} / 5</span>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed">{rev.comment}</p>
                <div className="pt-3 flex items-center gap-4 text-[11px] text-stone-500 border-t border-stone-100 font-medium">
                  <span>Destination Rating: <strong className="text-stone-800">{rev.destination_rating}★</strong></span>
                  <span>AI Planning Rating: <strong className="text-stone-800">{rev.ai_planning_rating}★</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Itinerary Confirmation Modal */}
      {showDeleteTripModal && (
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
                "{trip.title}" ({trip.duration_days} Days)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteTripModal(false)}
                disabled={isDeletingTrip}
                className="w-full py-2.5 rounded-full border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingTrip(true);
                  try {
                    await deleteItinerary(trip.id);
                    setShowDeleteTripModal(false);
                    onRefreshTrip();
                  } finally {
                    setIsDeletingTrip(false);
                  }
                }}
                disabled={isDeletingTrip}
                className="w-full py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingTrip ? (
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
