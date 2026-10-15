import React from 'react';
import { Shield, Flame, Activity, Globe, Clock, Satellite } from 'lucide-react';
import { formatGen } from '../utils/formatters';
import { ProtocolStats } from '../config/genlayer';

interface StatsOverviewProps {
  stats: ProtocolStats;
  totalPoliciesCount: number;
  activeCount: number;
  disputedCount: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  totalPoliciesCount,
  activeCount,
  disputedCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* Metric 1: Total Locked Relief Escrow */}
      <div className="bg-warroom-800/80 backdrop-blur border border-warroom-700/80 rounded-2xl p-5 hover:border-plasma-orange/50 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Relief Locked
          </span>
          <div className="w-9 h-9 rounded-xl bg-plasma-orange/15 border border-plasma-orange/30 flex items-center justify-center text-plasma-orange">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-heading font-bold text-white tracking-tight">
            {formatGen(stats.total_relief_locked || '0')}
          </span>
          <span className="font-mono text-sm text-plasma-orange font-semibold">GEN</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-telemetry-emerald inline-block" />
          Parametric Escrow Pool Ready
        </p>
      </div>

      {/* Metric 2: Wildfires Settled */}
      <div className="bg-warroom-800/80 backdrop-blur border border-warroom-700/80 rounded-2xl p-5 hover:border-plasma-flame/50 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Disasters Settled
          </span>
          <div className="w-9 h-9 rounded-xl bg-plasma-flame/15 border border-plasma-flame/30 flex items-center justify-center text-plasma-flame">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-heading font-bold text-white tracking-tight">
            {stats.total_disasters_settled}
          </span>
          <span className="text-xs text-slate-400 font-medium">dispatches</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-plasma-flame inline-block" />
          Autonomous AI Jury Consensus
        </p>
      </div>

      {/* Metric 3: Monitored Geofenced Zones */}
      <div className="bg-warroom-800/80 backdrop-blur border border-warroom-700/80 rounded-2xl p-5 hover:border-telemetry-cyan/50 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Monitored Forest Zones
          </span>
          <div className="w-9 h-9 rounded-xl bg-telemetry-cyan/15 border border-telemetry-cyan/30 flex items-center justify-center text-telemetry-cyan">
            <Globe className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-heading font-bold text-white tracking-tight">
            {totalPoliciesCount}
          </span>
          <span className="text-xs text-telemetry-cyan font-mono">({activeCount} active)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          <Satellite className="w-3 h-3 text-telemetry-cyan" />
          NASA FIRMS / Sentinel-3 Orbit
        </p>
      </div>

      {/* Metric 4: Security & Appeals */}
      <div className="bg-warroom-800/80 backdrop-blur border border-warroom-700/80 rounded-2xl p-5 hover:border-purple-500/50 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Cooling-Off Protocol
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-heading font-bold text-white tracking-tight">
            24
          </span>
          <span className="text-xs text-purple-400 font-mono">blocks (~72s)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-purple-400" />
          {disputedCount > 0 ? `${disputedCount} under dispute` : '10% Bond Anti-Fraud Shield'}
        </p>
      </div>

    </div>
  );
};
