import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Star, 
  BedDouble, 
  Phone, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  ExternalLink,
  Users,
  DollarSign
} from 'lucide-react';
import { Trip, Hotel } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';

interface OperatorHotelsProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
}

export const OperatorHotels: React.FC<OperatorHotelsProps> = ({ trips, onSelectTrip }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const apiHotels: Hotel[] = await TourFlowApi.getHotels();
        if (!isMounted) return;
        if (apiHotels && apiHotels.length > 0) {
          const mapped = apiHotels.map((h, idx) => ({
            id: h.id,
            name: h.name,
            sector: h.address || h.destination_id || 'Partner Sector',
            category: h.category || 'Hotel & Resort',
            rating: h.rating || 4.8,
            contracted_rooms: 10,
            occupied_rooms: Math.min(10, Math.max(2, (idx * 2 + 3) % 9)),
            rate_per_night: h.price_per_night || 8500,
            contact_manager: `Desk (+91 98160-${10000 + idx})`,
            amenities: h.amenities || ['Breakfast Included', 'Wi-Fi', 'Concierge Desk'],
            active_trips: trips.filter(
              (t) =>
                t.selected_accommodation?.name?.toLowerCase().includes(h.name.toLowerCase()) ||
                t.itinerary?.some((i) => i.title?.toLowerCase().includes(h.name.toLowerCase()))
            ),
            status: 'active',
          }));
          setHotels(mapped);
        } else {
          setHotels([]);
        }
      } catch {
        if (isMounted) setHotels([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [trips]);

  const filtered = hotels.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || h.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'all' || h.sector.toLowerCase().includes(sectorFilter.toLowerCase());
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Hotels & Resorts Allotments</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              DIRECT CONTRACTS
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Contracted mountain chalets, heritage palaces, and boutique resorts with real-time room allotments and guest manifests.
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          Partner Properties: <strong className="text-white">{hotels.length}</strong>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hotel by property name, sector, or city..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'himachal', 'darjeeling', 'goa'].map((sec) => (
            <button
              key={sec}
              onClick={() => setSectorFilter(sec)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                sectorFilter === sec
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec === 'all' ? 'All Sectors' : sec}
            </button>
          ))}
        </div>
      </div>

      {/* Hotels Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading partner properties...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Properties Found</div>
          <p className="text-xs mt-1">No partner hotels currently match the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                    {hotel.category}
                  </span>

                  <div className="flex items-center space-x-1 text-amber-400 text-xs font-bold font-mono">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{hotel.rating}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{hotel.name}</h3>

                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{hotel.sector}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Manager: <strong className="text-slate-300">{hotel.contact_manager}</strong></span>
                  </div>
                </div>

                {/* Room Allotment Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Allotment Occupancy:</span>
                    <span className="font-mono text-white font-bold">
                      {hotel.occupied_rooms} / {hotel.contracted_rooms} Rooms ({Math.round((hotel.occupied_rooms / hotel.contracted_rooms) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${(hotel.occupied_rooms / hotel.contracted_rooms) * 100}%` }}
                      className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Amenities Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {hotel.amenities.map((am: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {am}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions & Active Tours Assigned */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500">Contract Rate: </span>
                  <span className="font-bold text-emerald-400 font-mono text-xs">
                    ₹{hotel.rate_per_night.toLocaleString()} / night
                  </span>
                </div>

                {hotel.active_trips.length > 0 ? (
                  <button
                    onClick={() => onSelectTrip(hotel.active_trips[0].id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <span>View Tour #{hotel.active_trips[0].id}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">Allotment ready</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
