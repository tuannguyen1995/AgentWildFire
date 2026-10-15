import React, { useState } from 'react';
import { 
  Flame, 
  Satellite, 
  ShieldCheck, 
  Wallet, 
  RefreshCw, 
  ExternalLink,
  Settings,
  AlertCircle,
  Coins
} from 'lucide-react';
import { 
  STUDIONET_CHAIN_ID, 
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
    <header className="sticky top-0 z-40 bg-warroom-900/90 backdrop-blur-md border-b border-warroom-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Protocol Title */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-plasma-orange via-plasma-flame to-rose-700 shadow-ember">
              <Flame className="w-7 h-7 text-white animate-pulse" />
              <Satellite className="w-4 h-4 text-white/90 absolute -top-1 -right-1 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight text-white">
                  Agent<span className="text-plasma-orange">WildFire</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold rounded bg-plasma-orange/20 text-plasma-orange border border-plasma-orange/40">
                  v1.0 Studionet
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Satellite Wildfire Detection & Parametric Relief Escrow
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            
            {/* Network Badge */}
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitchingChain}
              title="Click to switch MetaMask to GenLayer StudioNet"
              className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-warroom-800 border border-warroom-700 hover:border-telemetry-cyan/50 transition-colors text-xs"
            >
              <div className="w-2 h-2 rounded-full bg-telemetry-cyan animate-ping" />
              <div className="w-2 h-2 rounded-full bg-telemetry-cyan -ml-3" />
              <span className="font-mono text-slate-300">StudioNet</span>
              <span className="text-slate-500 font-mono text-[10px]">(0xF22F)</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-warroom-800 border border-warroom-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all disabled:opacity-50"
              title="Refresh on-chain state"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-plasma-orange' : ''}`} />
            </button>

            {/* Contract Settings Pill */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg bg-warroom-800 border border-warroom-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all"
              title="Contract Address Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Claimable Balance Pill */}
            {account && BigInt(claimableBalance || '0') > 0n && (
              <button
                onClick={onClaim}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-telemetry-emerald/20 border border-telemetry-emerald/40 text-telemetry-emerald text-xs font-mono font-semibold hover:bg-telemetry-emerald/30 transition-all shadow-sm"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Claim {Number(BigInt(claimableBalance) / 1000000000000000n) / 1000} GEN</span>
              </button>
            )}

            {/* Wallet Connect */}
            {account ? (
              <div className="flex items-center space-x-2 bg-warroom-800 border border-warroom-700/80 rounded-xl p-1.5 pl-3">
                <div className="flex flex-col text-right">
                  <span className="font-mono text-xs font-medium text-slate-200">
                    {truncateAddress(account)}
                  </span>
                  <span className="font-mono text-[11px] text-plasma-orange font-semibold">
                    {balance} GEN
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-plasma-orange/30 to-amber-500/20 flex items-center justify-center border border-plasma-orange/30">
                  <ShieldCheck className="w-4 h-4 text-plasma-orange" />
                </div>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-medium text-sm transition-all shadow-ember active:scale-95"
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
        <div className="bg-warroom-850 border-b border-warroom-700 px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <AlertCircle className="w-4 h-4 text-plasma-orange flex-shrink-0" />
              <span>Intelligent Contract on Studionet:</span>
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <input
                type="text"
                value={customContract}
                onChange={(e) => setCustomContract(e.target.value)}
                className="w-full md:w-96 px-3 py-1.5 rounded-lg bg-warroom-900 border border-warroom-700 font-mono text-slate-200 focus:outline-none focus:border-plasma-orange"
                placeholder="0x..."
              />
              <button
                onClick={handleSaveContract}
                className="px-3 py-1.5 rounded-lg bg-plasma-orange text-white font-medium hover:bg-orange-600 transition-all"
              >
                Apply
              </button>
              <a
                href={`${STUDIO_URL}/contracts/${customContract}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-warroom-800 text-slate-400 hover:text-white"
                title="View in GenLayer Studio"
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
