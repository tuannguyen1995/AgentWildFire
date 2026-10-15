import React, { useState } from 'react';
import { 
  Flame, 
  Satellite, 
  MapPin, 
  Activity, 
  Scale, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  ShieldAlert,
  ArrowRight,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Coins
} from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { formatGen, formatDate, truncateAddress, getStatusMeta } from '../utils/formatters';

interface PolicyCardProps {
  policy: WildfirePolicyData;
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

export const PolicyCard: React.FC<PolicyCardProps> = ({
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
  const statusMeta = getStatusMeta(policy.status);
  const isSponsor = userAddress && policy.sponsor.toLowerCase() === userAddress.toLowerCase();
  const isBeneficiary = userAddress && policy.beneficiary.toLowerCase() === userAddress.toLowerCase();
  const isStakeholder = isSponsor || isBeneficiary;

  // Cooling window check
  const nowSecs = Math.floor(Date.now() / 1000);
  const auditCompleted = Number(policy.audit_completed_time || '0');
  const coolingRemaining = auditCompleted > 0 ? Math.max(0, (auditCompleted + 72) - nowSecs) : 0;
  const isCoolingActive = coolingRemaining > 0;

  // Expiration check
  const expiresAt = Number(policy.expires_at_time || '0');
  const isExpired = expiresAt > 0 && nowSecs > expiresAt;

  const handleCopyPoly = () => {
    navigator.clipboard.writeText(policy.forest_zone_polygon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const measuredFRP = policy.measured_peak_frp_mw;
  const thresholdFRP = policy.min_frp_threshold_mw;
  const frpPct = Math.min(100, Math.round((measuredFRP / Math.max(1, thresholdFRP)) * 100));

  return (
    <div className={`bg-warroom-800/90 border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl ${
      policy.status === 3 ? 'border-plasma-flame/50 shadow-fire' :
      policy.status === 1 ? 'border-plasma-orange/50 shadow-ember' :
      policy.status === 6 ? 'border-purple-500/50' :
      'border-warroom-700 hover:border-slate-600'
    }`}>
      
      {/* Card Header */}
      <div className="p-5 border-b border-warroom-700/60 bg-warroom-850/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-lg text-white">
              Policy #{policy.policy_id}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-heading font-extrabold text-white">
              {formatGen(policy.escrow_amount)}
            </span>
            <span className="font-mono text-xs text-plasma-orange font-bold">GEN</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Created: {formatDate(policy.created_at_time)}</span>
          <span className={isExpired ? 'text-amber-400' : 'text-slate-400'}>
            Expires: {formatDate(policy.expires_at_time)} {isExpired ? '(Expired)' : ''}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4 text-xs">
        
        {/* Forest Polygon Geofence */}
        <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700/80">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-telemetry-cyan" />
              Forest Geofence Polygon:
            </span>
            <button
              onClick={handleCopyPoly}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Copy WKT coordinates"
            >
              {copied ? <Check className="w-3 h-3 text-telemetry-emerald" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-telemetry-cyan text-[11px] truncate">
            {policy.forest_zone_polygon}
          </div>
        </div>

        {/* Thermal Meter Gauges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700/80">
            <div className="text-slate-400 mb-1">Trigger Threshold</div>
            <div className="font-mono font-bold text-sm text-slate-200">
              &ge; {policy.min_frp_threshold_mw} <span className="text-[10px] text-slate-400 font-normal">MW</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700/80">
            <div className="text-slate-400 mb-1">Peak Detected FRP</div>
            <div className={`font-mono font-bold text-sm ${
              measuredFRP >= thresholdFRP ? 'text-plasma-flame' : measuredFRP > 0 ? 'text-plasma-amber' : 'text-slate-400'
            }`}>
              {measuredFRP > 0 ? `${measuredFRP} MW` : 'No Breach Yet'}
            </div>
          </div>
        </div>

        {/* Progress Bar for FRP */}
        {measuredFRP > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Thermal Power Intensity ({frpPct}%)</span>
              <span>{policy.burned_area_hectares} ha affected</span>
            </div>
            <div className="w-full h-2 rounded-full bg-warroom-900 overflow-hidden border border-warroom-700">
              <div 
                className={`h-full transition-all duration-500 ${
                  measuredFRP >= thresholdFRP ? 'bg-gradient-to-r from-plasma-orange to-plasma-flame' : 'bg-plasma-amber'
                }`}
                style={{ width: `${frpPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Telemetry Endpoint Link */}
        {policy.satellite_feed_url && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-warroom-900/60 border border-warroom-700/60 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Satellite className="w-3.5 h-3.5 text-plasma-orange" />
              Source:
            </span>
            <a
              href={policy.satellite_feed_url}
              target="_blank"
              rel="noreferrer"
              className="text-plasma-orange hover:underline font-mono truncate max-w-[200px] flex items-center gap-1"
            >
              <span>{policy.satellite_feed_url}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Stakeholder Addresses */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-warroom-700/40">
          <div>
            <span className="text-slate-500">Sponsor: </span>
            <span className="font-mono text-slate-300">
              {truncateAddress(policy.sponsor)} {isSponsor ? '(You)' : ''}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Beneficiary: </span>
            <span className="font-mono text-slate-300">
              {truncateAddress(policy.beneficiary)} {isBeneficiary ? '(You)' : ''}
            </span>
          </div>
        </div>

      </div>

      {/* Card Action Footer */}
      <div className="p-4 border-t border-warroom-700/60 bg-warroom-850/80 flex flex-wrap items-center justify-between gap-2">
        
        {/* Secondary: Forensic Inspector */}
        <button
          onClick={() => onOpenInspector(policy)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-warroom-700 hover:bg-warroom-600 text-slate-200 text-xs font-medium transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Forensic Dossier</span>
        </button>

        {/* Contextual Primary Actions */}
        <div className="flex items-center space-x-2">

          {/* Trigger Alert: Active / Unresolved */}
          {(policy.status === 0 || policy.status === 8) && !isExpired && (
            <button
              onClick={() => onOpenTriggerAlert(policy)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white text-xs font-semibold shadow-ember transition-all disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Trigger Wildfire Alert</span>
            </button>
          )}

          {/* Adjudicate: Alert Triggered / Unresolved */}
          {(policy.status === 1 || policy.status === 8) && (
            <button
              onClick={() => onAdjudicate(policy.policy_id)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-plasma-orange hover:bg-orange-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Run AI Satellite Jury</span>
            </button>
          )}

          {/* Under Awaiting Payout */}
          {policy.status === 2 && (
            <>
              {/* Appeal (within cooling window) */}
              {isCoolingActive ? (
                <>
                  <button
                    onClick={() => onOpenAppeal(policy)}
                    disabled={isLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Appeal ({coolingRemaining}s)</span>
                  </button>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Cooling: ~{coolingRemaining}s
                  </div>
                </>
              ) : (
                /* Finalize (after cooling window) */
                <button
                  onClick={() => onFinalize(policy.policy_id)}
                  disabled={isLoading}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-telemetry-emerald hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Finalize Settlement</span>
                </button>
              )}
            </>
          )}

          {/* Disputed: Supreme Appellate Adjudication */}
          {policy.status === 6 && (
            <button
              onClick={() => onAdjudicateAppeal(policy.policy_id)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Adjudicate Appeal</span>
            </button>
          )}

          {/* Reclaim: Expired clean policies */}
          {(policy.status === 0 || policy.status === 8) && isExpired && (
            <button
              onClick={() => onReclaim(policy.policy_id)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all disabled:opacity-50"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Reclaim Escrow</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
