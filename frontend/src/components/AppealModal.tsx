import React, { useState } from 'react';
import { X, Scale, AlertTriangle, Shield, Satellite, Coins } from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: WildfirePolicyData | null;
  onSubmit: (policyId: string, reason: string, supplementalUrl: string, bondWei: bigint) => Promise<void>;
  isLoading: boolean;
}

const ACCREDITED_SUPPLEMENTAL = [
  {
    name: 'Copernicus Emergency Management Rapid Mapping',
    url: 'https://emergency.copernicus.eu/mapping/ems-rapid/EMSR999_thermal.json',
  },
  {
    name: 'Sentinel Hub (High-Res Infrared Radiometer)',
    url: 'https://sentinel-hub.com/api/v1/wildfire_thermal_zone_42.json',
  },
  {
    name: 'NASA FIRMS High-Confidence Thermal Anomaly',
    url: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/california_fire.json',
  },
];

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSubmit,
  isLoading,
}) => {
  const [reason, setReason] = useState('');
  const [supplementalUrl, setSupplementalUrl] = useState(ACCREDITED_SUPPLEMENTAL[0].url);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

  // Calculate required 10% bond
  const escrowWei = BigInt(policy.escrow_amount || '0');
  const requiredBondWei = escrowWei > 0n ? (escrowWei * 10n) / 100n : 1n;
  const bondGen = formatGen(requiredBondWei);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Detailed dispute justification (>= 10 characters) required.');
      return;
    }

    const cleanUrl = supplementalUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError('Valid accredited supplemental satellite URL required.');
      return;
    }

    try {
      await onSubmit(policy.policy_id, cleanReason, cleanUrl, requiredBondWei);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to file appeal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-warroom-850 border border-warroom-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warroom-700/80 bg-warroom-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <Scale className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                File Satellite Appellate Dispute
              </h3>
              <p className="text-xs text-slate-400">
                Policy #{policy.policy_id} &bull; 24-Block Cooling-Off Window Challenge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-warroom-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bond Staking Notice */}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-purple-400" />
                Required 10% Dispute Appeal Bond:
              </span>
              <span className="font-mono text-white text-sm bg-purple-900/60 px-2.5 py-0.5 rounded border border-purple-700">
                {bondGen} GEN
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              To prevent frivolous litigation, appellants must stake 10% of the policy escrow. If the Supreme Appellate Tribunal upholds your claim, your bond is refunded 100%. If dismissed, your bond is forfeited to the counterparty.
            </p>
          </div>

          {/* Current Verdict Recap */}
          <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700/80 text-xs space-y-1">
            <div className="text-slate-400 font-medium">Contested Initial Verdict:</div>
            <div className="font-mono text-plasma-orange font-bold">
              {policy.verdict}
            </div>
            <div className="text-[11px] text-slate-400 italic">
              &quot;{policy.reason}&quot;
            </div>
          </div>

          {/* Supplemental Accredited Satellite Endpoint */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-plasma-orange" />
                Supplemental High-Res Satellite Telemetry
              </span>
              <span className="text-[10px] text-slate-500">Accredited Orbits Only</span>
            </label>
            <input
              type="url"
              required
              value={supplementalUrl}
              onChange={(e) => setSupplementalUrl(e.target.value)}
              placeholder="https://emergency.copernicus.eu/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-warroom-900 border border-warroom-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Dispute Justification */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Dispute Justification & Physical Evidence Analysis (min 10 chars)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cloud cover obscured initial sensor passes. Copernicus multispectral infrared logs verify severe crown breach exceeding 380 MW..."
              className="w-full px-3.5 py-2 rounded-xl bg-warroom-900 border border-warroom-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-warroom-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-warroom-700 hover:bg-warroom-700 text-slate-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              <Scale className="w-4 h-4" />
              <span>{isLoading ? 'Staking Bond & Submitting...' : `Stake ${bondGen} GEN & Appeal`}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
