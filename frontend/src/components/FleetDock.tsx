import React, { useState } from 'react';
import { 
  Flame, 
  Satellite, 
  Plus, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Coins,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { formatGen, getStatusMeta } from '../utils/formatters';

interface FleetDockProps {
  policies: WildfirePolicyData[];
  selectedPolicy: WildfirePolicyData | null;
  onSelectPolicy: (policy: WildfirePolicyData) => void;
  onOpenCreate: () => void;
}

export const FleetDock: React.FC<FleetDockProps> = ({
  policies,
  selectedPolicy,
  onSelectPolicy,
  onOpenCreate,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = policies.filter((p) => {
    if (filter === 'active' && p.status !== 0) return false;
    if (filter === 'alert' && p.status !== 1) return false;
    if (filter === 'awaiting' && p.status !== 2) return false;
    if (filter === 'disputed' && p.status !== 6) return false;
    if (filter === 'settled' && p.status !== 3 && p.status !== 4) return false;
    if (filter === 'refunded' && p.status !== 5 && p.status !== 7) return false;
    if (filter === 'unresolved' && p.status !== 8) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.policy_id.includes(q) ||
        p.forest_zone_polygon.toLowerCase().includes(q) ||
        p.sponsor.toLowerCase().includes(q) ||
        p.beneficiary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-warroom-900 border border-warroom-700/80 rounded-3xl p-5 shadow-2xl hud-bracket">
      
      {/* Dock Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-warroom-700/70">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-plasma-orange/15 border border-plasma-orange/30 flex items-center justify-center text-plasma-orange">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <span>Parametric Forest Fleet Matrix</span>
              <span className="font-mono text-xs px-2 py-0.2 rounded-full bg-warroom-800 text-telemetry-cyan border border-warroom-700">
                {policies.length} ZONES
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Select any forest canopy to switch active radar tracking & contract execution
            </p>
          </div>
        </div>

        {/* Right Search & New Policy CTA */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search zones, coords, IDs..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-warroom-950 border border-warroom-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-plasma-orange font-mono"
            />
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs shadow-ember transition-all flex-shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Policy</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
        {[
          { id: 'all', label: 'All Zones', count: policies.length },
          { id: 'active', label: 'Active Surveillance', count: policies.filter(p => p.status === 0).length },
          { id: 'alert', label: 'Alert Triggered', count: policies.filter(p => p.status === 1).length },
          { id: 'awaiting', label: 'Awaiting Settlement', count: policies.filter(p => p.status === 2).length },
          { id: 'disputed', label: 'Appeals', count: policies.filter(p => p.status === 6).length },
          { id: 'settled', label: 'Disaster Paid', count: policies.filter(p => p.status === 3 || p.status === 4).length },
          { id: 'refunded', label: 'Clean / Refunded', count: policies.filter(p => p.status === 5 || p.status === 7).length },
          { id: 'unresolved', label: 'Protected', count: policies.filter(p => p.status === 8).length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center space-x-1.5 text-[11px] ${
              filter === f.id
                ? 'bg-plasma-orange text-white font-semibold shadow-ember'
                : 'bg-warroom-950 text-slate-400 hover:text-white border border-warroom-700/80'
            }`}
          >
            <span>{f.label}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Horizontal Fleet Cards Carousel */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filtered.map((policy) => {
            const isSelected = selectedPolicy?.policy_id === policy.policy_id;
            const statusMeta = getStatusMeta(policy.status);
            const isEmergency = policy.status === 3 || policy.status === 1;

            return (
              <div
                key={policy.policy_id}
                onClick={() => onSelectPolicy(policy)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-warroom-800 border-plasma-orange shadow-ember'
                    : isEmergency
                    ? 'bg-warroom-950 border-plasma-flame/50 hover:border-plasma-flame'
                    : 'bg-warroom-950 border-warroom-700/80 hover:border-slate-500'
                }`}
              >
                {/* Active Indicator Top Accent */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-plasma-orange" />
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-heading font-extrabold text-sm text-white">
                      #{policy.policy_id}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${statusMeta.badgeClass}`}>
                      {statusMeta.label.split(' ')[0]}
                    </span>
                  </div>

                  <span className="font-mono font-bold text-xs text-white">
                    {formatGen(policy.escrow_amount)} <span className="text-[10px] text-plasma-orange">GEN</span>
                  </span>
                </div>

                <div className="font-mono text-[10px] text-telemetry-cyan truncate mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{policy.forest_zone_polygon}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-warroom-700/60">
                  <span className="text-slate-400">
                    Trigger: &ge; {policy.min_frp_threshold_mw} MW
                  </span>
                  <span className={`font-bold ${
                    policy.measured_peak_frp_mw >= policy.min_frp_threshold_mw
                      ? 'text-plasma-flame'
                      : policy.measured_peak_frp_mw > 0
                      ? 'text-plasma-amber'
                      : 'text-slate-500'
                  }`}>
                    {policy.measured_peak_frp_mw > 0 ? `${policy.measured_peak_frp_mw} MW` : 'Nominal'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 font-mono text-xs">
          No parametric geofences matching filter.
        </div>
      )}

    </div>
  );
};
