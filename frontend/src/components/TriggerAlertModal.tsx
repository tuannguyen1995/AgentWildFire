import React, { useState } from 'react';
import { X, Satellite, AlertTriangle, ShieldCheck, ExternalLink, Flame } from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';

interface TriggerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: WildfirePolicyData | null;
  onSubmit: (policyId: string, satelliteUrl: string, secondarySatelliteUrl?: string) => Promise<void>;
  isLoading: boolean;
}

const ACCREDITED_PRESETS = [
  {
    name: 'NASA FIRMS (MODIS Active Fire Telemetry)',
    url: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/california_fire.json',
    source: 'NASA EOSDIS',
  },
  {
    name: 'Copernicus Emergency Management Rapid Mapping',
    url: 'https://emergency.copernicus.eu/mapping/ems-rapid/EMSR789_california_thermal.json',
    source: 'European Union Copernicus',
  },
  {
    name: 'Sentinel Hub (Infrared Radiometer Radiance)',
    url: 'https://sentinel-hub.com/api/v1/wildfire_thermal_zone_42.json',
    source: 'ESA Sentinel-3',
  },
  {
    name: 'NOAA Hazard Mapping System (HMS Fire Logs)',
    url: 'https://noaa.gov/telemetry/hazard_mapping_system.json',
    source: 'NOAA Satellite Division',
  },
];

const ACCREDITED_DOMAINS = [
  'firms.modaps.eosdis.nasa.gov',
  'nasa.gov',
  'sentinel-hub.com',
  'copernicus.eu',
  'effis.jrc.ec.europa.eu',
  'noaa.gov',
  'wildfire.gov',
  'calfire.ca.gov',
  'emergency.copernicus.eu',
];

function isAccredited(url: string): boolean {
  try {
    const clean = url.trim().toLowerCase();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
    const noProto = clean.split('://')[1];
    const host = noProto.split('/')[0].split(':')[0];
    return ACCREDITED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

export const TriggerAlertModal: React.FC<TriggerAlertModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSubmit,
  isLoading,
}) => {
  const [satelliteUrl, setSatelliteUrl] = useState(ACCREDITED_PRESETS[0].url);
  const [secondarySatelliteUrl, setSecondarySatelliteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

  const validSource = isAccredited(satelliteUrl);
  const validSecSource = !secondarySatelliteUrl.trim() || isAccredited(secondarySatelliteUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validSource) {
      setError('Telemetry unauthenticated: Primary URL must strictly originate from an accredited satellite source.');
      return;
    }

    if (!validSecSource) {
      setError('Telemetry unauthenticated: Secondary URL must strictly originate from an accredited satellite source.');
      return;
    }

    try {
      await onSubmit(policy.policy_id, satelliteUrl.trim(), secondarySatelliteUrl.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger wildfire alert.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-warroom-850 border border-warroom-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warroom-700/80 bg-warroom-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-plasma-orange/20 border border-plasma-orange/40 text-plasma-orange">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                Submit Satellite Wildfire Alert
              </h3>
              <p className="text-xs text-slate-400">
                Policy #{policy.policy_id} &bull; Trigger Threshold: &ge; {policy.min_frp_threshold_mw} MW
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

          {/* Target Forest Zone Polygon Recap */}
          <div className="p-3 rounded-xl bg-warroom-900 border border-warroom-700/70 text-xs space-y-1">
            <div className="text-slate-400 font-medium">Target Geofenced Polygon:</div>
            <div className="font-mono text-telemetry-cyan text-[11px] break-all">
              {policy.forest_zone_polygon}
            </div>
          </div>

          {/* Quick Satellite Feed Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-telemetry-emerald" />
                Accredited Observation Endpoints
              </span>
              <span className="text-[10px] text-slate-500">Official Space Agencies</span>
            </label>
            <div className="space-y-2">
              {ACCREDITED_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSatelliteUrl(preset.url)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    satelliteUrl === preset.url
                      ? 'bg-plasma-orange/15 border-plasma-orange/60 text-white'
                      : 'bg-warroom-900 border-warroom-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{preset.name}</span>
                    <span className="text-[10px] font-mono text-plasma-orange">{preset.source}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {preset.url}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry URL Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Primary Satellite Endpoint (NASA FIRMS / Sentinel)</span>
              <span className={`text-[10px] font-mono ${validSource ? 'text-telemetry-emerald' : 'text-rose-400'}`}>
                {validSource ? '✓ Accredited Source' : '✗ Unaccredited Domain'}
              </span>
            </label>
            <input
              type="url"
              required
              value={satelliteUrl}
              onChange={(e) => setSatelliteUrl(e.target.value)}
              placeholder="https://firms.modaps.eosdis.nasa.gov/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-warroom-900 border border-warroom-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-plasma-orange"
            />
          </div>

          {/* Secondary Telemetry URL Input (Multi-Satellite Corroboration) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Secondary Satellite Feed (Optional Cross-Validation)</span>
              </span>
              <span className={`text-[10px] font-mono ${validSecSource ? 'text-telemetry-emerald' : 'text-rose-400'}`}>
                {secondarySatelliteUrl.trim() ? (validSecSource ? '✓ Accredited Source' : '✗ Unaccredited Domain') : 'Optional'}
              </span>
            </label>
            <input
              type="url"
              value={secondarySatelliteUrl}
              onChange={(e) => setSecondarySatelliteUrl(e.target.value)}
              placeholder="https://sentinel-hub.com/... or https://emergency.copernicus.eu/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-warroom-900 border border-warroom-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-plasma-orange"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Provides multi-sensor satellite corroboration to power the Tri-Lens AI Magistrate cross-examination.
            </p>
          </div>

          {/* Information box */}
          <div className="p-3 rounded-xl bg-plasma-orange/10 border border-plasma-orange/20 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-plasma-orange">
              <Flame className="w-3.5 h-3.5" />
              <span>Autonomous Remote Sensing Protocol</span>
            </div>
            <p>
              Once submitted, GenLayer AI validators render the telemetry on-chain via <code className="text-telemetry-cyan font-mono">gl.nondet.web.render</code>, extract peak Fire Radiative Power (MW), and adjudicate 100% relief payout within minutes.
            </p>
          </div>

          {/* Actions */}
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
              disabled={isLoading || !validSource}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs transition-all shadow-ember disabled:opacity-50"
            >
              <Satellite className="w-4 h-4" />
              <span>{isLoading ? 'Submitting to Studionet...' : 'Submit Wildfire Alert'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
