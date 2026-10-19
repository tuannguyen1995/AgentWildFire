import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Satellite, 
  MapPin, 
  Activity, 
  Scale, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight,
  Eye,
  Hash,
  Coins
} from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { formatGen, formatDate, truncateAddress, getStatusMeta } from '../utils/formatters';

interface MissionCockpitProps {
  policy: WildfirePolicyData | null;
  userAddress: string;
  onOpenTriggerAlert: (policy: WildfirePolicyData) => void;
  onOpenInspector: (policy: WildfirePolicyData) => void;
  onOpenAppeal: (policy: WildfirePolicyData) => void;
  onAdjudicate: (policyId: string) => Promise<void>;
  onAdjudicateAppeal: (policyId: string) => Promise<void>;
  onFinalize: (policyId: string) => Promise<void>;
  onReclaim: (policyId: string) => Promise<void>;
  isLoading: boolean;
}

export const MissionCockpit: React.FC<MissionCockpitProps> = ({
  policy,
  userAddress,
  onOpenTriggerAlert,
  onOpenInspector,
  onOpenAppeal,
  onAdjudicate,
  onAdjudicateAppeal,
  onFinalize,
  onReclaim,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [coolingLeft, setCoolingLeft] = useState<number>(0);

  useEffect(() => {
    if (!policy || !policy.audit_completed_time || policy.audit_completed_time === '0') {
      setCoolingLeft(0);
      return;
    }
    const completed = Number(policy.audit_completed_time);
    const deadline = completed + 72; // 72s cooling window

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const rem = Math.max(0, deadline - now);
      setCoolingLeft(rem);
    }, 1000);

    return () => clearInterval(interval);
  }, [policy]);

  if (!policy) {
    return (
      <div className="bg-warroom-900 border border-warroom-700/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[460px] hud-bracket">
        <div className="w-16 h-16 rounded-2xl bg-plasma-orange/15 border border-plasma-orange/30 flex items-center justify-center text-plasma-orange mb-4 animate-flame-flicker">
          <Satellite className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-heading font-bold text-white mb-2">
          Parametric Operations Cockpit Ready
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Select any geofenced forest zone on the tactical radar or from the fleet dock below to initialize mission monitoring and AI adjudication.
        </p>
        <span className="font-mono text-[10px] text-telemetry-cyan bg-warroom-850 px-3 py-1.5 rounded-full border border-warroom-700">
          AWAITING TARGET SELECTION
        </span>
      </div>
    );
  }

  const statusMeta = getStatusMeta(policy.status);
  const measuredFRP = policy.measured_peak_frp_mw;
  const thresholdFRP = policy.min_frp_threshold_mw;
  const frpPct = Math.min(100, Math.round((measuredFRP / Math.max(1, thresholdFRP)) * 100));

  const isSponsor = userAddress && policy.sponsor.toLowerCase() === userAddress.toLowerCase();
  const isBeneficiary = userAddress && policy.beneficiary.toLowerCase() === userAddress.toLowerCase();

  const nowSecs = Math.floor(Date.now() / 1000);
  const expiresAt = Number(policy.expires_at_time || '0');
  const isExpired = expiresAt > 0 && nowSecs > expiresAt;

  const handleCopyPoly = () => {
    navigator.clipboard.writeText(policy.forest_zone_polygon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-warroom-900 border border-warroom-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full hud-bracket">
      
      {/* Cockpit Header */}
      <div className="p-5 bg-warroom-950 border-b border-warroom-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-plasma-orange/15 border border-plasma-orange/40 flex items-center justify-center text-plasma-orange">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-extrabold text-base text-white">
                TARGET GEOFENCE #{policy.policy_id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span>EXPIRES: {formatDate(policy.expires_at_time)}</span>
              {isExpired && <span className="text-amber-400 font-bold">(EXPIRED)</span>}
            </div>
          </div>
        </div>

        {/* Escrow Badge */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase font-mono font-medium">Relief Escrow</div>
          <div className="flex items-baseline space-x-1">
            <span className="font-heading font-extrabold text-xl text-white">
              {formatGen(policy.escrow_amount)}
            </span>
            <span className="font-mono text-xs text-plasma-orange font-bold">GEN</span>
          </div>
        </div>
      </div>

      {/* Cockpit Body */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
        
        {/* Thermal Intensity Radial Meter */}
        <div className="p-4 rounded-2xl bg-warroom-950 border border-warroom-700/90 relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-plasma-orange" />
              <span>Fire Radiative Power (FRP) Radiance</span>
            </span>
            <span className="font-mono text-[11px] text-telemetry-cyan font-bold">
              {frpPct}% of Trigger Level
            </span>
          </div>

          {/* Dual Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-warroom-900 border border-warroom-700/80">
              <div className="text-[10px] text-slate-400 font-mono">MEASURED PEAK FRP</div>
              <div className={`font-mono font-extrabold text-xl mt-0.5 ${
                measuredFRP >= thresholdFRP ? 'text-plasma-flame' : measuredFRP > 0 ? 'text-plasma-amber' : 'text-slate-400'
              }`}>
                {measuredFRP > 0 ? `${measuredFRP} MW` : '0 MW'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-warroom-900 border border-warroom-700/80">
              <div className="text-[10px] text-slate-400 font-mono">PARAMETRIC TRIGGER</div>
              <div className="font-mono font-extrabold text-xl text-telemetry-cyan mt-0.5">
                &ge; {thresholdFRP} MW
              </div>
            </div>
          </div>

          {/* Progress Bar with Thermal Gradient */}
          <div className="space-y-1">
            <div className="w-full h-3 rounded-full bg-warroom-900 overflow-hidden border border-warroom-700 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  measuredFRP >= thresholdFRP
                    ? 'bg-gradient-to-r from-plasma-orange via-plasma-flame to-rose-600 shadow-fire'
                    : measuredFRP > 0
                    ? 'bg-gradient-to-r from-amber-500 to-plasma-orange'
                    : 'bg-slate-700'
                }`}
                style={{ width: `${Math.max(4, frpPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0 MW (Ambient)</span>
              <span>Spot Fire: {Math.floor(thresholdFRP / 2)} MW</span>
              <span className="text-plasma-flame font-bold">Trigger: {thresholdFRP} MW</span>
            </div>
          </div>

          {/* Estimated Burn Area */}
          {policy.burned_area_hectares > 0 && (
            <div className="mt-3 pt-2.5 border-t border-warroom-700/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Burn Footprint:</span>
              <span className="text-white font-bold">{policy.burned_area_hectares.toLocaleString()} Hectares (~{(policy.burned_area_hectares * 2.471).toFixed(0)} acres)</span>
            </div>
          )}
        </div>

        {/* Autonomous Circuit Breaker Alert Banner */}
        {policy.status === 9 && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/80 text-red-200 space-y-1 animate-pulse">
            <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Autonomous Circuit Breaker Engaged</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Telemetry anomaly or adversarial sensor spoofing detected (&gt;50k MW). 100% of escrow funds are locked and preserved to prevent fraudulent draining.
            </p>
          </div>
        )}

        {/* AI Remote Sensing Magistrate Verdict Preview */}
        <div className="p-3.5 rounded-2xl bg-warroom-950 border border-warroom-700 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-plasma-orange" />
              <span>AI Remote Sensing Consensus Verdict:</span>
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-warroom-900 text-plasma-orange font-bold border border-warroom-700">
              {policy.verdict}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-sans italic bg-warroom-900/60 p-2 rounded-lg border border-warroom-800">
            &quot;{policy.reason || 'No remote sensing jury adjudication performed yet.'}&quot;
          </p>

          {/* Tri-Lens AI Multi-Perspective Consensus Breakdown */}
          {policy.tri_lens_breakdown && (
            <div className="mt-2 pt-2 border-t border-warroom-800/80">
              <div className="text-[10px] font-mono text-telemetry-cyan font-semibold flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3 h-3 text-telemetry-cyan" />
                <span>Tri-Lens Magistrate Consensus Protocol:</span>
              </div>
              <div className="text-[10.5px] text-slate-300 font-mono bg-warroom-900/80 p-2 rounded border border-warroom-750 leading-relaxed">
                {policy.tri_lens_breakdown}
              </div>
            </div>
          )}
        </div>

        {/* Observation Feeds */}
        {policy.satellite_feed_url && (
          <div className="p-3 rounded-xl bg-warroom-950 border border-warroom-700 space-y-1 text-[11px]">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Satellite className="w-3 h-3 text-plasma-orange" />
                Telemetry Sources
              </span>
              {policy.secondary_satellite_url && (
                <span className="text-telemetry-emerald text-[9px] font-bold">Multi-Satellite Corroborated</span>
              )}
            </div>
            <div className="space-y-1 font-mono text-[10px] truncate">
              <div className="flex items-center gap-1 text-slate-300 truncate">
                <span className="text-slate-500">Primary:</span>
                <span className="text-plasma-orange truncate">{policy.satellite_feed_url}</span>
              </div>
              {policy.secondary_satellite_url && (
                <div className="flex items-center gap-1 text-slate-300 truncate">
                  <span className="text-slate-500">Secondary:</span>
                  <span className="text-telemetry-cyan truncate">{policy.secondary_satellite_url}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Geofence Polygon Coordinates */}
        <div className="p-3.5 rounded-2xl bg-warroom-950 border border-warroom-700">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-telemetry-cyan" />
              Target Coordinate Polygon (WKT):
            </span>
            <button
              onClick={handleCopyPoly}
              className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-telemetry-emerald" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-[11px] text-telemetry-cyan break-all bg-warroom-900 p-2 rounded-lg border border-warroom-800">
            {policy.forest_zone_polygon}
          </div>
        </div>

        {/* Stakeholder Addresses & First Responder */}
        <div className="grid grid-cols-2 gap-2 font-mono text-[10px] pt-1 border-t border-warroom-700/60">
          <div>
            <span className="text-slate-500">Sponsor DAO: </span>
            <div className="text-slate-300 truncate font-semibold">
              {truncateAddress(policy.sponsor)} {isSponsor ? '(You)' : ''}
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Beneficiary: </span>
            <div className="text-slate-300 truncate font-semibold">
              {truncateAddress(policy.beneficiary)} {isBeneficiary ? '(You)' : ''}
            </div>
          </div>
          {policy.reporter_address && policy.reporter_address !== '0x0000000000000000000000000000000000000000' && (
            <div className="col-span-2 pt-1 border-t border-warroom-800/60 flex items-center justify-between">
              <span className="text-slate-500">First Responder Oracle:</span>
              <span className="text-telemetry-emerald font-semibold">{truncateAddress(policy.reporter_address)}</span>
            </div>
          )}
        </div>

      </div>

      {/* Cockpit Execution Actions (Footer) */}
      <div className="p-4 bg-warroom-950 border-t border-warroom-700/80 space-y-2">
        
        {/* State 0 / 8: Trigger Alert */}
        {(policy.status === 0 || policy.status === 8) && !isExpired && (
          <button
            onClick={() => onOpenTriggerAlert(policy)}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-plasma-orange via-plasma-flame to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-ember transition-all active:scale-95 disabled:opacity-50"
          >
            <Flame className="w-4 h-4 animate-pulse" />
            <span>Trigger Satellite Wildfire Alert</span>
          </button>
        )}

        {/* State 1 / 8: Adjudicate AI Jury */}
        {(policy.status === 1 || policy.status === 8) && (
          <button
            onClick={() => onAdjudicate(policy.policy_id)}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-plasma-orange hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-ember transition-all active:scale-95 disabled:opacity-50"
          >
            <Satellite className="w-4 h-4 animate-spin" />
            <span>Dispatch AI Remote Sensing Jury</span>
          </button>
        )}

        {/* State 2: Cooling-off Challenge & Finalize */}
        {policy.status === 2 && (
          <div className="space-y-2">
            {coolingLeft > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 font-mono text-xs text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Cooling-off Challenge Window:</span>
                  </span>
                  <span className="font-bold text-white text-sm bg-purple-900/60 px-2 py-0.5 rounded">
                    ~{coolingLeft}s
                  </span>
                </div>

                <button
                  onClick={() => onOpenAppeal(policy)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <Scale className="w-4 h-4" />
                  <span>Stake 10% Bond & File Appeal</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onFinalize(policy.policy_id)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-telemetry-emerald hover:bg-emerald-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-cyber transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalize 100% Disaster Relief Settlement</span>
              </button>
            )}
          </div>
        )}

        {/* State 6: Supreme Appellate Adjudication */}
        {policy.status === 6 && (
          <button
            onClick={() => onAdjudicateAppeal(policy.policy_id)}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Scale className="w-4 h-4" />
            <span>Convene Supreme Appellate Tribunal</span>
          </button>
        )}

        {/* Expired Clean: Reclaim */}
        {(policy.status === 0 || policy.status === 8) && isExpired && (
          <button
            onClick={() => onReclaim(policy.policy_id)}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition-all disabled:opacity-50"
          >
            <Coins className="w-4 h-4" />
            <span>Reclaim Unbreached Escrow Pool</span>
          </button>
        )}

        {/* Forensic Dossier Button */}
        <button
          onClick={() => onOpenInspector(policy)}
          className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-warroom-850 hover:bg-warroom-800 border border-warroom-700 text-slate-300 font-mono text-[11px] transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect Satellite Forensic Dossier & SHA-256</span>
        </button>

      </div>

    </div>
  );
};
