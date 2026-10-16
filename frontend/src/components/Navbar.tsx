import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Satellite, 
  ShieldCheck, 
  Wallet, 
  RefreshCw, 
  ExternalLink,
  Settings,
  AlertCircle,
  Coins,
  Radio,
  Clock,
  Compass
} from 'lucide-react';
import { 
  STUDIONET_CHAIN_ID_HEX, 
  STUDIO_URL, 
  getSavedContractAddress, 
  saveContractAddress, 
  switchToStudionet 
} from '../config/genlayer';
import { truncateAddress } from '../utils/formatters';

interface NavbarProps {
  account: string;
  onConnect: () => void;
  balance: string;
  claimableBalance: string;
  onClaim: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  onConnect,
  balance,
  claimableBalance,
  onClaim,
  onRefresh,
  isLoading,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [customContract, setCustomContract] = useState(getSavedContractAddress());
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveContract = () => {
    saveContractAddress(customContract);
    setShowConfig(false);
    window.location.reload();
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingChain(true);
    if ((window as any).ethereum) {
      await switchToStudionet((window as any).ethereum);
    }
    setIsSwitchingChain(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-warroom-950/95 backdrop-blur-md border-b border-warroom-700/80 shadow-2xl">
      
      {/* Top Aerospace Telemetry Ticker */}
      <div className="hidden lg:flex items-center justify-between px-6 py-1 bg-warroom-900 border-b border-warroom-700/50 text-[10px] font-mono text-slate-400">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-telemetry-cyan">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="font-semibold">CONSTELLATION:</span>
            <span className="text-slate-300">NASA FIRMS (Terra/Aqua) • Sentinel-3 (SLSTR) • Copernicus EMS Rapid</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="flex items-center space-x-1.5 text-telemetry-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-telemetry-emerald animate-ping" />
            <span>ORBIT RECEPTOR: ONLINE (0.00% LOSS)</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
            <Clock className="w-3 h-3 text-plasma-orange" />
            <span>MISSION CLOCK: {utcTime}</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="text-slate-400">
            NETWORK: <span className="text-telemetry-cyan font-bold">STUDIONET (0xF22F)</span>
          </div>
        </div>
      </div>

      {/* Main Mission Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Logo & Protocol Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-plasma-orange via-plasma-flame to-rose-700 shadow-ember border border-plasma-orange/40">
              <Flame className="w-7 h-7 text-white animate-flame-flicker" />
              <Satellite className="w-4 h-4 text-white absolute -top-1 -right-1 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight text-white flex items-center">
                  Agent<span className="text-plasma-orange">WildFire</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest font-bold rounded bg-plasma-orange/20 text-plasma-orange border border-plasma-orange/50">
                  MISSION CONTROL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-sans">
                Autonomous Satellite Wildfire Detection & Parametric Disaster Relief Escrow
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            
            {/* Studionet Chain Switch Button */}
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitchingChain}
              title="Click to verify or switch MetaMask to GenLayer StudioNet"
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-warroom-850 border border-warroom-700 hover:border-telemetry-cyan/50 transition-all text-xs"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-telemetry-cyan animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-telemetry-cyan" />
              </div>
              <span className="font-mono text-slate-200 font-semibold">StudioNet</span>
              <span className="text-telemetry-cyan font-mono text-[10px] font-bold">0xF22F</span>
            </button>

            {/* Quick Refresh */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-warroom-850 border border-warroom-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all disabled:opacity-50"
              title="Refresh telemetry & contract state"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-plasma-orange' : ''}`} />
            </button>

            {/* Contract Settings */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg bg-warroom-850 border border-warroom-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all"
              title="Contract Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Pull-Payment Claim Pill */}
            {account && BigInt(claimableBalance || '0') > 0n && (
              <button
                onClick={onClaim}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-telemetry-emerald/20 border border-telemetry-emerald/50 text-telemetry-emerald text-xs font-mono font-bold hover:bg-telemetry-emerald/30 transition-all shadow-cyber animate-pulse"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Withdraw {Number(BigInt(claimableBalance) / 1000000000000000n) / 1000} GEN</span>
              </button>
            )}

            {/* Wallet Connect Button */}
            {account ? (
              <div className="flex items-center space-x-2 bg-warroom-850 border border-warroom-700 rounded-xl p-1.5 pl-3">
                <div className="flex flex-col text-right">
                  <span className="font-mono text-xs font-medium text-slate-200">
                    {truncateAddress(account)}
                  </span>
                  <span className="font-mono text-[11px] text-plasma-orange font-bold">
                    {balance} GEN
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-plasma-orange/30 to-amber-500/20 flex items-center justify-center border border-plasma-orange/40">
                  <ShieldCheck className="w-4 h-4 text-plasma-orange" />
                </div>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-ember active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Contract Settings Drawer */}
      {showConfig && (
        <div className="bg-warroom-900 border-b border-warroom-700 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <AlertCircle className="w-4 h-4 text-plasma-orange flex-shrink-0" />
              <span className="font-mono">GenLayer Intelligent Contract Address:</span>
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <input
                type="text"
                value={customContract}
                onChange={(e) => setCustomContract(e.target.value)}
                className="w-full md:w-96 px-3 py-1.5 rounded-lg bg-warroom-950 border border-warroom-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-plasma-orange"
                placeholder="0x..."
              />
              <button
                onClick={handleSaveContract}
                className="px-3 py-1.5 rounded-lg bg-plasma-orange text-white font-semibold hover:bg-orange-600 transition-all text-xs"
              >
                Apply
              </button>
              <a
                href={`${STUDIO_URL}/contracts/${customContract}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-warroom-800 text-slate-400 hover:text-white"
                title="Inspect in GenLayer Studio"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
