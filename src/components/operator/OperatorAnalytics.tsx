import React from 'react';
import { TrendingUp, Sparkles, ShieldCheck, Star, Users, CheckCircle2, DollarSign, Clock, BarChart3 } from 'lucide-react';

interface OperatorAnalyticsProps {
  analyticsData?: any;
}

export const OperatorAnalytics: React.FC<OperatorAnalyticsProps> = ({ analyticsData }) => {
  const data = analyticsData || {
    overview: {
      total_tours_operated: 0,
      active_tours: 0,
      total_travelers_hosted: 0,
      total_gross_revenue: 0,
      avg_satisfaction_rating: 0,
      disruption_recovery_rate: 0,
      ai_replan_adoption_rate: 0,
      avg_resolution_time_minutes: 0,
    },
    monthly_revenue: [],
    vendor_performance: [],
  };

  const monthlyRevenue = data.monthly_revenue || [];
  const vendorPerformance = data.vendor_performance || [];
  const maxRevenue = Math.max(...monthlyRevenue.map((m: any) => m.revenue || 0), 100000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Operations Performance & AI Efficiency</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Analytics on disruption mitigation speed, Gemini AI replan adoption, guest satisfaction, and monthly gross volume.
        </p>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">Disruption Recovery Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {data.overview?.disruption_recovery_rate ? `${data.overview.disruption_recovery_rate}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Disruption resolution success rate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">AI Replan Acceptance Rate</div>
          <div className="text-2xl font-bold text-sky-400 mt-2">
            {data.overview?.ai_replan_adoption_rate ? `${data.overview.ai_replan_adoption_rate}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">First candidate approved</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">Avg Resolution Latency</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {data.overview?.avg_resolution_time_minutes ? `${data.overview.avg_resolution_time_minutes} min` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">From weather trigger to traveler dispatch</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">Avg Guest Satisfaction</div>
          <div className="text-2xl font-bold text-white mt-2">
            {data.overview?.avg_satisfaction_rating ? `★ ${data.overview.avg_satisfaction_rating}` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Based on {data.overview?.total_tours_operated || 0} completed tours
          </div>
        </div>
      </div>

      {/* Monthly Revenue Bars */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Monthly Operations Volume (INR)</h2>
            <p className="text-xs text-slate-400">Total gross tour packages booked and dispatched</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Total: ₹{(data.overview?.total_gross_revenue || 0).toLocaleString()}
          </span>
        </div>

        {monthlyRevenue.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No monthly revenue records available for the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
            {monthlyRevenue.map((m: any) => {
              const heightPct = Math.round(((m.revenue || 0) / maxRevenue) * 100);
              return (
                <div key={m.month} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{((m.revenue || 0) / 100000).toFixed(1)}L
                  </div>
                  <div
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    className="w-full bg-gradient-to-t from-emerald-700 to-teal-400 rounded-t-xl transition-all group-hover:brightness-125"
                  />
                  <div className="text-xs font-bold text-slate-300 mt-2">{m.month}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vendor SLA Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">Vendor SLA & On-Time Fulfillment</h2>
          <p className="text-xs text-slate-400">Reliability scores across active contract partners</p>
        </div>

        {vendorPerformance.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No vendor SLA records currently logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">SLA Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {vendorPerformance.map((v: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-bold text-white">{v.name}</td>
                    <td className="px-5 py-3.5 uppercase text-[10px] font-semibold text-slate-400">{v.category}</td>
                    <td className="px-5 py-3.5 font-mono text-amber-400 font-bold">★ {v.rating}</td>
                    <td className="px-5 py-3.5 font-mono text-emerald-400 font-bold">{v.on_time_fulfillment_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
