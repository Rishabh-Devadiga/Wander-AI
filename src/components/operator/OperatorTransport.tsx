import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Navigation, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Fuel,
  Radio
} from 'lucide-react';
import { Trip, TransportOption } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';

interface OperatorTransportProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
}

export const OperatorTransport: React.FC<OperatorTransportProps> = ({ trips, onSelectTrip }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetTypeFilter, setFleetTypeFilter] = useState('all');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTransport = async () => {
      setLoading(true);
      try {
        const apiTransport: TransportOption[] = await TourFlowApi.getTransport();
        if (!isMounted) return;
        if (apiTransport && apiTransport.length > 0) {
          const mapped = apiTransport.map((t, idx) => ({
            id: t.id,
            model: t.name || `Partner Vehicle ${idx + 1}`,
            reg_number: `TF ${t.type ? t.type.toUpperCase() : 'FLEET'} ${1000 + idx}`,
            category: t.type || 'private_cab',
            capacity: `${t.capacity || 4} Pax`,
            assigned_chauffeur: `Fleet Chauffeur (+91 98177-${10000 + idx})`,
            current_route: `${t.route_from || 'Transit Hub'} → ${t.route_to || 'Destination'}`,
            fuel_status: '90%',
            gps_telemetry: 'Active GPS Link',
            snow_chains: t.type === 'private_cab' ? 'Equipped' : 'N/A',
            assigned_trip_id: trips[idx % trips.length]?.id || null,
            status: idx % 2 === 0 ? 'on_ground' : 'standby',
          }));
          setVehicles(mapped);
        } else {
          setVehicles([]);
        }
      } catch {
        if (isMounted) setVehicles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTransport();
    return () => {
      isMounted = false;
    };
  }, [trips]);

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.reg_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.assigned_chauffeur.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = fleetTypeFilter === 'all' || v.category.toLowerCase().includes(fleetTypeFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Transport & Fleet Dispatch</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              GPS TELEMETRY
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Fleet operations: 4x4 SUVs, luxury Tempo Travelers, airport chauffeurs, and real-time transit safety telemetry.
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          Active Fleet Units: <strong className="text-white">{vehicles.length}</strong>
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
            placeholder="Search vehicle model, registration number, or chauffeur..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'private_cab', 'volvo_bus', 'flight', 'train'].map((flt) => (
            <button
              key={flt}
              onClick={() => setFleetTypeFilter(flt)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                fleetTypeFilter === flt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {flt === 'all' ? 'All Fleet' : flt.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading fleet units...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Car className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Fleet Units Found</div>
          <p className="text-xs mt-1">No transport options currently match the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((veh) => (
            <div
              key={veh.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-sky-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {veh.reg_number}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">{veh.model}</h3>
                </div>

                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                    veh.status === 'on_ground'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {veh.status === 'on_ground' ? '🟢 Active Route' : 'Standby'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Chauffeur Contact</span>
                  <span className="text-slate-200 font-medium">{veh.assigned_chauffeur}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Seating Capacity</span>
                  <span className="text-slate-200 font-medium">{veh.capacity}</span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase">Assigned Route</span>
                  <span className="text-slate-200 font-medium flex items-center space-x-1">
                    <Navigation className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>{veh.current_route}</span>
                  </span>
                </div>
              </div>

              {/* Telemetry Status */}
              <div className="text-xs text-slate-400 space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>GPS Telemetry:</span>
                  </span>
                  <span className="font-mono text-slate-300">{veh.gps_telemetry}</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Mountain Safety Gear:</span>
                  </span>
                  <span className="text-slate-300 font-medium">Snow Chains: {veh.snow_chains}</span>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                {veh.assigned_trip_id ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Assigned to:</span>
                    <span className="text-xs font-mono font-bold text-sky-400">Tour #{veh.assigned_trip_id}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Unassigned / Standby</span>
                )}

                {veh.assigned_trip_id && (
                  <button
                    onClick={() => onSelectTrip(veh.assigned_trip_id!)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <span>Open Tour Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
