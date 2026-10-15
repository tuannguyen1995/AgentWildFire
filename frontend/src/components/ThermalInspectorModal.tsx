import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Satellite, 
  ShieldCheck, 
  Activity, 
  Hash, 
  MapPin, 
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { formatGen, getStatusMeta } from '../utils/formatters';

interface ThermalInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: WildfirePolicyData | null;
}

export const ThermalInspectorModal: React.FC<ThermalInspectorModalProps> = ({
  isOpen,
  onClose,
  policy,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!policy || !policy.audit_completed_time || policy.audit_completed_time === '0') {
      setTimeLeft(0);
      return;
    }

    const completed = Number(policy.audit_completed_time);
    const deadline = completed + 72; // 72 seconds cooling window

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, deadline - now);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [policy]);

  if (!isOpen || !policy) return null;

  const statusMeta = getStatusMeta(policy.status);
  const measuredFRP = policy.measured_peak_frp_mw;
  const thresholdFRP = policy.min_frp_threshold_mw;
  const isBreached = measuredFRP >= thresholdFRP;
  const isPartial = measuredFRP >= Math.floor(thresholdFRP / 2) && measuredFRP < thresholdFRP;

  const handleCopyHash = () => {
    if (policy.evidence_hash) {
      navigator.clipboard.writeText(policy.evidence_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-warroom-850 border border-warroom-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warroom-700/80 bg-warroom-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-plasma-flame/20 border border-plasma-flame/40 text-plasma-flame">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-heading font-bold text-lg text-white">
                  Satellite Thermal Telemetry Forensic Dossier
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-warroom-700 text-slate-300">
                  #{policy.policy_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Earth Observation Consensus Verification & Parametric Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-warroom-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Status Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-warroom-900 border border-warroom-700">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Consensus Lifecycle Status
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
                <span className="text-xs text-slate-300">
                  Confidence: <span className="font-mono font-bold text-telemetry-emerald">{policy.confidence}%</span>
                </span>
              </div>
            </div>

            {/* Cooling-off Countdown Badge */}
            {policy.status === 2 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-plasma-orange/15 border border-plasma-orange/30 text-plasma-orange text-xs">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Cooling-off window active: </span>
                <span className="font-mono font-bold">~{timeLeft > 0 ? `${timeLeft}s` : 'Ready to Finalize'}</span>
              </div>
            )}
          </div>

          {/* FRP Meter & Thermal Radiance Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Measured Peak FRP */}
            <div className={`p-4 rounded-xl border ${
              isBreached 
                ? 'bg-rose-950/20 border-rose-600/50' 
                : isPartial 
                ? 'bg-amber-950/20 border-amber-600/50' 
                : 'bg-warroom-900 border-warroom-700'
            }`}>
              <div className="text-xs text-slate-400 font-medium">Peak Measured FRP</div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className={`text-2xl font-mono font-extrabold ${
                  isBreached ? 'text-plasma-flame' : isPartial ? 'text-plasma-amber' : 'text-slate-100'
                }`}>
                  {measuredFRP}
                </span>
                <span className="text-xs font-mono text-slate-400">MegaWatts</span>
              </div>
              <div className="text-[11px] mt-2 font-medium">
                {isBreached && <span className="text-plasma-flame">⚠️ Severe Breach (&ge; {thresholdFRP} MW)</span>}
                {isPartial && <span className="text-plasma-amber">⚠️ Spot Fire Breach (40% Relief)</span>}
                {!isBreached && !isPartial && <span className="text-telemetry-emerald">✓ Sub-threshold safe</span>}
              </div>
            </div>

            {/* Trigger Threshold */}
            <div className="p-4 rounded-xl bg-warroom-900 border border-warroom-700">
              <div className="text-xs text-slate-400 font-medium">Parametric Trigger Limit</div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-mono font-extrabold text-telemetry-cyan">
                  {thresholdFRP}
                </span>
                <span className="text-xs font-mono text-slate-400">MegaWatts</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                Spot corridor: &ge; {Math.floor(thresholdFRP / 2)} MW
              </div>
            </div>

            {/* Affected Acreage */}
            <div className="p-4 rounded-xl bg-warroom-900 border border-warroom-700">
              <div className="text-xs text-slate-400 font-medium">Estimated Burn Area</div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-mono font-extrabold text-white">
                  {policy.burned_area_hectares.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-slate-400">Hectares</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                ~{(policy.burned_area_hectares * 2.471).toFixed(0)} acres affected
              </div>
            </div>

          </div>

          {/* AI Satellite Jury Verdict & Rationale */}
          <div className="p-4 rounded-xl bg-warroom-900/80 border border-warroom-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-plasma-orange" />
                AI Chief Remote Sensing Magistrate Rationale
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-warroom-800 text-plasma-orange border border-warroom-700">
                {policy.verdict}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans bg-warroom-950 p-3 rounded-lg border border-warroom-800">
              {policy.reason || 'No analysis recorded yet.'}
            </p>
          </div>

          {/* Geofence & Source Endpoints */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Telemetry Parameters & Evidence
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              
              <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700">
                <div className="text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-telemetry-cyan" />
                  Forest Zone Polygon:
                </div>
                <div className="font-mono text-telemetry-cyan text-[11px] break-all">
                  {policy.forest_zone_polygon}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700">
                <div className="text-slate-400 mb-1 flex items-center gap-1">
                  <Satellite className="w-3.5 h-3.5 text-plasma-orange" />
                  Telemetry Source Endpoint:
                </div>
                {policy.satellite_feed_url ? (
                  <a
                    href={policy.satellite_feed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-plasma-orange hover:underline text-[11px] break-all flex items-center gap-1"
                  >
                    <span>{policy.satellite_feed_url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-500 font-mono text-[11px]">No feed bound yet</span>
                )}
              </div>

            </div>
          </div>

          {/* Cryptographic SHA-256 Digest */}
          {policy.evidence_hash && (
            <div className="p-3 rounded-xl bg-warroom-900/70 border border-warroom-700 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Hash className="w-3.5 h-3.5 text-telemetry-emerald" />
                  SHA-256 Observation Evidence Hash Digest:
                </span>
                <button
                  onClick={handleCopyHash}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-telemetry-emerald" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-telemetry-emerald break-all bg-warroom-950 p-2 rounded-lg border border-warroom-800">
                {policy.evidence_hash}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-warroom-700/80 bg-warroom-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-telemetry-emerald" />
            <span>Escrow Protected: {formatGen(policy.escrow_amount)} GEN</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-warroom-700 hover:bg-warroom-600 text-white text-xs font-semibold transition-all"
          >
            Close Forensic View
          </button>
        </div>

      </div>
    </div>
  );
};
