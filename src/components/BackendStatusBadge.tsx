import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Database } from 'lucide-react';
import { TourFlowApi } from '../services/api';
import { HealthStatus } from '../types/tourflow';

export default function BackendStatusBadge() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TourFlowApi.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Connecting to backend...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="backend-status-container" className="flex items-center gap-2 text-xs">
      <div
        id="backend-status-pill"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          health?.status === 'healthy'
            ? 'bg-stone-900 text-white border-stone-800 shadow-xs'
            : error
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-stone-100 border-stone-200 text-stone-700'
        }`}
      >
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-400" />
        ) : health?.status === 'healthy' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        )}

        <span className="font-bold tracking-wide text-[11px]">
          {health?.status === 'healthy' ? 'FastAPI & PostgreSQL Live' : 'Backend Connecting'}
        </span>

        {health && (
          <span className="hidden sm:inline-flex items-center gap-1.5 pl-2 border-l border-stone-700 text-[11px] text-stone-300">
            <Database className="w-3 h-3 text-rose-400" />
            <span>{health.counts.destinations} Dests</span>
            <span className="text-stone-600">•</span>
            <span>{health.counts.trips} Trips</span>
            <span className="text-stone-600">•</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Gemini 2.5</span>
          </span>
        )}
      </div>

      <button
        id="refresh-health-btn"
        onClick={checkHealth}
        title="Check Backend Connection"
        className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
