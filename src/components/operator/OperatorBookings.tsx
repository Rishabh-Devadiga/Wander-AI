import React, { useState } from 'react';
import { Ticket, Search, Check, X, RefreshCw, Filter, ArrowUpRight } from 'lucide-react';

interface OperatorBookingsProps {
  bookings: any[];
  onBookingAction: (bookingId: string, action: 'confirm' | 'cancel' | 'rebook') => void;
  onSelectTrip: (tripId: string) => void;
}

export const OperatorBookings: React.FC<OperatorBookingsProps> = ({
  bookings,
  onBookingAction,
  onSelectTrip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.trip_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.item_type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Central Bookings & Allotments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time ledger of all vouchers, airline PNRs, hotel rooms, and adventure permits.
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          Total Bookings: <strong className="text-white">{bookings.length}</strong>
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
            placeholder="Search by voucher reference, trip, or vendor..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'confirmed', 'cancelled', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Ticket className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <div className="font-bold text-white text-sm">No Bookings Found</div>
          <p className="text-xs mt-1">There are currently no active vouchers or bookings logged in the system.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Voucher Ref</th>
                  <th className="px-5 py-3">Tour</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{b.booking_reference}</td>

                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => onSelectTrip(b.trip_id)}
                        className="font-medium text-white hover:text-emerald-400 transition-colors flex items-center space-x-1"
                      >
                        <span>{b.trip_title}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">#{b.trip_id}</span>
                    </td>

                    <td className="px-5 py-3.5 uppercase text-[11px] font-semibold text-slate-400">{b.item_type}</td>

                    <td className="px-5 py-3.5 font-medium text-slate-200">{b.vendor_name || b.vendor_id}</td>

                    <td className="px-5 py-3.5 font-mono font-bold text-white">₹{b.amount.toLocaleString()}</td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : b.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-1">
                      {b.status === 'cancelled' ? (
                        <button
                          onClick={() => onBookingAction(b.id, 'rebook')}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold rounded border border-emerald-500/30 transition-colors"
                        >
                          Rebook
                        </button>
                      ) : (
                        <button
                          onClick={() => onBookingAction(b.id, 'cancel')}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-semibold rounded border border-rose-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
