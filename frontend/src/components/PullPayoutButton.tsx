import React from 'react';
import { Coins, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
import { formatGen } from '../utils/formatters';

interface PullPayoutButtonProps {
  claimableBalance: string;
  onClaim: () => Promise<void>;
  isLoading: boolean;
}

export const PullPayoutButton: React.FC<PullPayoutButtonProps> = ({
  claimableBalance,
  onClaim,
  isLoading,
}) => {
  const hasBalance = BigInt(claimableBalance || '0') > 0n;

  if (!hasBalance) return null;

  return (
    <div className="bg-gradient-to-r from-telemetry-emerald/20 via-emerald-900/30 to-telemetry-emerald/20 border border-telemetry-emerald/40 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-950/20">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-telemetry-emerald/20 border border-telemetry-emerald/50 flex items-center justify-center text-telemetry-emerald flex-shrink-0">
          <Coins className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h4 className="text-sm font-heading font-bold text-white flex items-center gap-1.5">
            <span>Disaster Relief Escrow Available For Withdrawal</span>
            <span className="w-2 h-2 rounded-full bg-telemetry-emerald animate-ping" />
          </h4>
          <p className="text-xs text-slate-300">
            You have <span className="font-mono font-bold text-telemetry-emerald">{formatGen(claimableBalance)} GEN</span> safely buffered in pull-payment escrow.
          </p>
        </div>
      </div>

      <button
        onClick={onClaim}
        disabled={isLoading}
        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-telemetry-emerald hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex-shrink-0"
      >
        <ArrowDownToLine className="w-4 h-4" />
        <span>{isLoading ? 'Processing Claim...' : 'Withdraw Relief Funds (claim_payout)'}</span>
      </button>
    </div>
  );
};
