import React, { useState } from 'react';
import { X, Flame, Shield, MapPin, Zap, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { parseGenToWei } from '../utils/formatters';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    beneficiary: string;
    polygon: string;
    minFrp: number;
    durationBlocks: number;
    escrowGen: string;
  }) => Promise<void>;
  userAddress: string;
  isLoading: boolean;
}

const PRESETS = [
  {
    name: 'California Sierra Nevada (Butte County)',
    polygon: 'POLYGON((-121.5 39.5, -121.0 39.5, -121.0 40.0, -121.5 40.0))',
    frp: 250,
  },
  {
    name: 'Amazon Rainforest (Acre / Madre de Dios)',
    polygon: 'POLYGON((-68.5 -10.5, -67.8 -10.5, -67.8 -9.8, -68.5 -9.8))',
    frp: 300,
  },
  {
    name: 'Mediterranean Pine Canopy (Evia, Greece)',
    polygon: 'POLYGON((23.2 38.6, 23.9 38.6, 23.9 39.1, 23.2 39.1))',
    frp: 200,
  },
  {
    name: 'Australian Blue Mountains Bushland (NSW)',
    polygon: 'POLYGON((150.1 -33.8, 150.7 -33.8, 150.7 -33.2, 150.1 -33.2))',
    frp: 350,
  },
];

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userAddress,
  isLoading,
}) => {
  const [beneficiary, setBeneficiary] = useState('');
  const [polygon, setPolygon] = useState(PRESETS[0].polygon);
  const [minFrp, setMinFrp] = useState(250);
  const [durationBlocks, setDurationBlocks] = useState(6000);
  const [escrowGen, setEscrowGen] = useState('1.0');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setPolygon(preset.polygon);
    setMinFrp(preset.frp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanBen = beneficiary.trim();
    if (!cleanBen.startsWith('0x') || cleanBen.length !== 42) {
      setError('Please provide a valid 42-character hex beneficiary address (0x...).');
      return;
    }

    if (userAddress && cleanBen.toLowerCase() === userAddress.toLowerCase()) {
      setError('Sponsor cannot designate themselves as relief beneficiary.');
      return;
    }

    const cleanPoly = polygon.trim();
    if (cleanPoly.length < 8) {
      setError('Valid forest zone coordinate polygon required (>= 8 chars).');
      return;
    }

    const genVal = parseFloat(escrowGen);
    if (isNaN(genVal) || genVal <= 0) {
      setError('Relief escrow deposit must be greater than 0 GEN.');
      return;
    }

    try {
      await onSubmit({
        beneficiary: cleanBen,
        polygon: cleanPoly,
        minFrp,
        durationBlocks,
        escrowGen,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize relief policy.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-warroom-850 border border-warroom-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warroom-700/80 bg-warroom-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-plasma-orange/20 border border-plasma-orange/40 text-plasma-orange">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                Initialize Parametric Relief Policy
              </h3>
              <p className="text-xs text-slate-400">
                Lock escrow pool for autonomous satellite wildfire payouts
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-plasma-orange" />
              <span>Quick Forest Geofence Presets:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    polygon === p.polygon
                      ? 'bg-plasma-orange/15 border-plasma-orange/60 text-white'
                      : 'bg-warroom-800 border-warroom-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Trigger: &ge; {p.frp} MW
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Beneficiary Address */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-telemetry-emerald" />
                Relief Beneficiary Address
              </span>
              <span className="text-[11px] text-slate-400">Local Fire Dept / Indigenous Community</span>
            </label>
            <input
              type="text"
              required
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="0x9A21... (e.g. Indigenous Council or Relief NGO)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-warroom-900 border border-warroom-700 font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-plasma-orange"
            />
          </div>

          {/* Polygon Geofence Coordinates */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-telemetry-cyan" />
                Forest Zone Polygon (WKT Coordinates)
              </span>
              <span className="text-[11px] text-slate-400">Bounding Box Lat/Long</span>
            </label>
            <input
              type="text"
              required
              value={polygon}
              onChange={(e) => setPolygon(e.target.value)}
              placeholder="POLYGON((-121.5 39.5, -121.0 39.5, -121.0 40.0, -121.5 40.0))"
              className="w-full px-3.5 py-2.5 rounded-xl bg-warroom-900 border border-warroom-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-plasma-orange"
            />
          </div>

          {/* FRP Trigger Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-plasma-orange" />
                  Min FRP Trigger (MW)
                </span>
                <span className="font-mono text-plasma-orange font-bold text-xs">
                  {minFrp} MW
                </span>
              </label>
              <input
                type="range"
                min={50}
                max={1000}
                step={25}
                value={minFrp}
                onChange={(e) => setMinFrp(Number(e.target.value))}
                className="w-full accent-plasma-orange cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                FRP &ge; {minFrp} MW: 100% payout | &ge; {Math.floor(minFrp / 2)} MW: 40% partial
              </p>
            </div>

            {/* Coverage Duration */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Coverage Duration (Blocks)
                </span>
                <span className="font-mono text-purple-400 text-xs">
                  {durationBlocks} blk (~{(durationBlocks * 3) / 60}m)
                </span>
              </label>
              <select
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-warroom-900 border border-warroom-700 text-xs text-slate-200 focus:outline-none focus:border-plasma-orange"
              >
                <option value={100}>100 Blocks (~5 mins - Demo/Testing)</option>
                <option value={6000}>6,000 Blocks (~5 hours)</option>
                <option value={28800}>28,800 Blocks (~24 hours / 1 day)</option>
                <option value={201600}>201,600 Blocks (~7 days)</option>
                <option value={864000}>864,000 Blocks (~30 days full season)</option>
              </select>
            </div>
          </div>

          {/* Escrow Deposit (GEN) */}
          <div className="bg-warroom-900/60 p-4 rounded-xl border border-warroom-700/80">
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-plasma-orange" />
                Relief Escrow Deposit Amount
              </span>
              <span className="text-[11px] text-slate-400">Locked in contract</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={escrowGen}
                onChange={(e) => setEscrowGen(e.target.value)}
                placeholder="1.0"
                className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-warroom-850 border border-warroom-700 font-mono text-base font-bold text-white focus:outline-none focus:border-plasma-orange"
              />
              <span className="absolute right-4 top-2.5 font-mono text-sm font-semibold text-plasma-orange">
                GEN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Funds remain secured until an accredited satellite breach or returnable via clean expiration.
            </p>
          </div>

          {/* Modal Action Buttons */}
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs transition-all shadow-ember disabled:opacity-50"
            >
              <Flame className="w-4 h-4" />
              <span>{isLoading ? 'Locking Escrow on Studionet...' : 'Lock Relief Escrow'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
