import React, { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Star, ShieldCheck, ToggleLeft, ToggleRight, Search, Filter } from 'lucide-react';
import type { OperatorVendor } from '../../server/operatorEngine';

interface OperatorVendorsProps {
  vendors: OperatorVendor[];
  onToggleVendor: (vendorId: string) => void;
}

export const OperatorVendors: React.FC<OperatorVendorsProps> = ({ vendors, onToggleVendor }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = vendors.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contact_person.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || v.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Partner Vendor Network</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Verified ground operators, luxury resorts, mountain 4x4 fleets, and adventure outfitters.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            Total Vendors: <strong className="text-white">{vendors.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor by name, city, or contact..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'hotel', 'transport', 'activity', 'flight', 'guide'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Vendors Found</div>
          <p className="text-xs mt-1">No partner vendors match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => (
            <div
              key={vendor.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                vendor.is_available ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/50 bg-slate-950/40 opacity-75'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {vendor.category}
                  </span>

                  <button
                    id={`btn-toggle-vendor-${vendor.id}`}
                    onClick={() => onToggleVendor(vendor.id)}
                    className={`flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      vendor.is_available
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                    title="Toggle vendor availability"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{vendor.is_available ? 'Active Allotment' : 'Suspended'}</span>
                  </button>
                </div>

                <h3 className="text-base font-bold text-white">{vendor.name}</h3>

                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{vendor.location}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{vendor.phone} ({vendor.contact_person})</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-amber-400 font-bold font-mono">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{vendor.rating}</span>
                </div>

                <div className="text-slate-400">
                  <strong className="text-white font-mono">{vendor.active_bookings_count}</strong> active tours
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
