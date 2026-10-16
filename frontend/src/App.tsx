import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Flame, 
  Satellite, 
  Plus, 
  Search, 
  Radio, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Globe, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  Terminal,
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { TacticalRadarViewport } from './components/TacticalRadarViewport';
import { MissionCockpit } from './components/MissionCockpit';
import { FleetDock } from './components/FleetDock';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { TriggerAlertModal } from './components/TriggerAlertModal';
import { ThermalInspectorModal } from './components/ThermalInspectorModal';
import { AppealModal } from './components/AppealModal';
import { 
  STUDIONET_CHAIN_ID_HEX,
  STUDIO_URL,
  getSavedContractAddress,
  fetchContractStats,
  fetchAllPolicies,
  fetchClaimableBalance,
  fetchStudionetBalance,
  switchToStudionet,
  createReliefPolicy,
  triggerWildfireAlert,
  adjudicateWildfireSeverity,
  appealVerdict,
  adjudicateAppeal,
  finalizeSettlement,
  cancelOrReclaim,
  claimPayout,
  WildfirePolicyData,
  ProtocolStats
} from './config/genlayer';
import { formatGen } from './utils/formatters';

export const App: React.FC = () => {
  // Wallet & network state
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000');
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Contract data state
  const [stats, setStats] = useState<ProtocolStats>({
    total_policies: 0,
    total_relief_locked: '0',
    total_disasters_settled: 0,
  });
  const [policies, setPolicies] = useState<WildfirePolicyData[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<WildfirePolicyData | null>(null);

  // Modal triggers
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isTriggerOpen, setIsTriggerOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = useState<boolean>(false);
  const [modalTargetPolicy, setModalTargetPolicy] = useState<WildfirePolicyData | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      showToast('error', 'MetaMask is not detected. Please install MetaMask to interact on Studionet.');
      return;
    }
    try {
      setIsLoading(true);
      await switchToStudionet((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        showToast('success', `Mission Control Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        refreshBalances(accounts[0]);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Wallet connection cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalances = async (userAddr: string) => {
    if (!userAddr) return;
    try {
      const bal = await fetchStudionetBalance(userAddr);
      setBalance(bal);
      const claimable = await fetchClaimableBalance(contractAddress, userAddr);
      setClaimableBalance(claimable);
    } catch (err) {
      console.warn('Balance refresh error:', err);
    }
  };

  // Load live data from Studionet
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, policiesData] = await Promise.all([
        fetchContractStats(contractAddress),
        fetchAllPolicies(contractAddress),
      ]);
      setStats(statsData);
      setPolicies(policiesData);

      // Maintain or set default selected policy
      setSelectedPolicy((prev) => {
        if (prev) {
          const updated = policiesData.find((p) => p.policy_id === prev.policy_id);
          return updated || policiesData[0] || null;
        }
        return policiesData[0] || null;
      });

      if (account) {
        await refreshBalances(account);
      }
    } catch (err) {
      console.warn('Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, account]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 9000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle wallet events
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccountsChanged = (accs: string[]) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          refreshBalances(accs[0]);
        } else {
          setAccount('');
          setBalance('0.000');
          setClaimableBalance('0');
        }
      };
      eth.on('accountsChanged', handleAccountsChanged);
      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [contractAddress]);

  // Actions
  const handleCreatePolicy = async (data: {
    beneficiary: string;
    polygon: string;
    minFrp: number;
    durationBlocks: number;
    escrowGen: string;
  }) => {
    if (!account) throw new Error('Please connect wallet');
    setIsLoading(true);
    try {
      await createReliefPolicy(
        contractAddress,
        account,
        data.beneficiary,
        data.polygon,
        data.minFrp,
        data.durationBlocks,
        data.escrowGen
      );
      showToast('success', 'Parametric Relief Policy successfully locked on Studionet!');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Policy creation failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerAlert = async (policyId: string, satelliteUrl: string) => {
    if (!account) throw new Error('Please connect wallet');
    setIsLoading(true);
    try {
      await triggerWildfireAlert(contractAddress, account, policyId, satelliteUrl);
      showToast('success', `Satellite wildfire alert filed for Zone #${policyId}. Ready for AI Remote Sensing Jury!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to submit satellite alert');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjudicate = async (policyId: string) => {
    if (!account) return showToast('info', 'Please connect wallet');
    setIsLoading(true);
    showToast('info', 'AI Remote Sensing Jury analyzing NASA/Copernicus infrared radiance...');
    try {
      await adjudicateWildfireSeverity(contractAddress, account, policyId);
      showToast('success', `AI Adjudication completed for Zone #${policyId}!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Adjudication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppeal = async (policyId: string, reason: string, supplementalUrl: string, bondWei: bigint) => {
    if (!account) throw new Error('Please connect wallet');
    setIsLoading(true);
    try {
      await appealVerdict(contractAddress, account, policyId, reason, supplementalUrl, bondWei);
      showToast('success', `Appeal filed for Zone #${policyId} with 10% staked dispute bond.`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Appeal filing failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjudicateAppeal = async (policyId: string) => {
    if (!account) return showToast('info', 'Please connect wallet');
    setIsLoading(true);
    showToast('info', 'Supreme Satellite Appellate Tribunal reviewing supplemental logs...');
    try {
      await adjudicateAppeal(contractAddress, account, policyId);
      showToast('success', `Appellate Tribunal decision recorded for Zone #${policyId}!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Appellate adjudication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async (policyId: string) => {
    if (!account) return showToast('info', 'Please connect wallet');
    setIsLoading(true);
    try {
      await finalizeSettlement(contractAddress, account, policyId);
      showToast('success', `Settlement finalized for Zone #${policyId}. Funds dispatched!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Finalization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReclaim = async (policyId: string) => {
    if (!account) return showToast('info', 'Please connect wallet');
    setIsLoading(true);
    try {
      await cancelOrReclaim(contractAddress, account, policyId);
      showToast('success', `Expired escrow reclaimed for Zone #${policyId}!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Reclaim failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimPayout = async () => {
    if (!account) return showToast('info', 'Please connect wallet');
    setIsLoading(true);
    try {
      await claimPayout(contractAddress, account);
      showToast('success', 'Relief escrow safely withdrawn to your wallet!');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Claim failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warroom-900 text-slate-100 flex flex-col grid-tactical selection:bg-plasma-orange selection:text-white">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 animate-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success'
            ? 'bg-telemetry-emerald/20 border-telemetry-emerald/60 text-emerald-200 shadow-cyber'
            : toast.type === 'error'
            ? 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-fire'
            : 'bg-warroom-950 border-plasma-orange text-orange-200 shadow-ember'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-telemetry-emerald" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />}
          {toast.type === 'info' && <Radio className="w-5 h-5 flex-shrink-0 text-plasma-orange animate-pulse" />}
          <span className="text-xs font-mono font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Aerospace Navbar */}
      <Navbar
        account={account}
        onConnect={connectWallet}
        balance={balance}
        claimableBalance={claimableBalance}
        onClaim={handleClaimPayout}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {/* VIP Mission Control HUD Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          <div className="bg-warroom-900/90 border border-warroom-700/80 rounded-2xl p-4 flex items-center justify-between hud-bracket shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Total Relief Escrow
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-heading font-extrabold text-white">
                  {formatGen(stats.total_relief_locked || '0')}
                </span>
                <span className="font-mono text-xs text-plasma-orange font-bold">GEN</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-plasma-orange/15 border border-plasma-orange/30 flex items-center justify-center text-plasma-orange">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-warroom-900/90 border border-warroom-700/80 rounded-2xl p-4 flex items-center justify-between hud-bracket shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Disasters Settled
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-heading font-extrabold text-white">
                  {stats.total_disasters_settled}
                </span>
                <span className="text-xs text-slate-400 font-mono">Dispatches</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-plasma-flame/15 border border-plasma-flame/30 flex items-center justify-center text-plasma-flame">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-warroom-900/90 border border-warroom-700/80 rounded-2xl p-4 flex items-center justify-between hud-bracket shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Monitored Canopies
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-heading font-extrabold text-white">
                  {policies.length}
                </span>
                <span className="text-xs text-telemetry-cyan font-mono">Zones Active</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-telemetry-cyan/15 border border-telemetry-cyan/30 flex items-center justify-center text-telemetry-cyan">
              <Globe className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-warroom-900/90 border border-warroom-700/80 rounded-2xl p-4 flex items-center justify-between hud-bracket shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Cooling Challenge
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-heading font-extrabold text-purple-300">
                  24
                </span>
                <span className="text-xs text-purple-400 font-mono">Blocks (~72s)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Central Tactical Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Wing (7 Cols): Tactical Earth Observation Radar Viewport */}
          <div className="lg:col-span-7 flex flex-col">
            <TacticalRadarViewport
              policies={policies}
              selectedPolicy={selectedPolicy}
              onSelectPolicy={(p) => setSelectedPolicy(p)}
              onOpenTriggerAlert={(p) => {
                setModalTargetPolicy(p);
                setIsTriggerOpen(true);
              }}
              onOpenInspector={(p) => {
                setModalTargetPolicy(p);
                setIsInspectorOpen(true);
              }}
            />
          </div>

          {/* Right Wing (5 Cols): Parametric Operations Cockpit */}
          <div className="lg:col-span-5 flex flex-col">
            <MissionCockpit
              policy={selectedPolicy}
              userAddress={account}
              onOpenTriggerAlert={(p) => {
                setModalTargetPolicy(p);
                setIsTriggerOpen(true);
              }}
              onOpenInspector={(p) => {
                setModalTargetPolicy(p);
                setIsInspectorOpen(true);
              }}
              onOpenAppeal={(p) => {
                setModalTargetPolicy(p);
                setIsAppealOpen(true);
              }}
              onAdjudicate={handleAdjudicate}
              onAdjudicateAppeal={handleAdjudicateAppeal}
              onFinalize={handleFinalize}
              onReclaim={handleReclaim}
              isLoading={isLoading}
            />
          </div>

        </div>

        {/* Bottom Fleet Matrix Dock */}
        <FleetDock
          policies={policies}
          selectedPolicy={selectedPolicy}
          onSelectPolicy={(p) => setSelectedPolicy(p)}
          onOpenCreate={() => setIsCreateOpen(true)}
        />

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-warroom-700/80 bg-warroom-950 py-5 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <Flame className="w-4 h-4 text-plasma-orange" />
            <span className="font-heading font-bold text-slate-200">AgentWildFire Protocol</span>
            <span className="text-slate-600">|</span>
            <span>GenLayer StudioNet (Chain ID: 61999 / 0xF22F)</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <a
              href={`${STUDIO_URL}/contracts/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-plasma-orange transition-colors flex items-center gap-1"
            >
              <span>Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">|</span>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-telemetry-cyan transition-colors"
            >
              Docs
            </a>
            <span className="text-slate-600">|</span>
            <a
              href="https://github.com/tuannguyen1995/AgentWildFire"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreatePolicyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePolicy}
        userAddress={account}
        isLoading={isLoading}
      />

      <TriggerAlertModal
        isOpen={isTriggerOpen}
        onClose={() => {
          setIsTriggerOpen(false);
          setModalTargetPolicy(null);
        }}
        policy={modalTargetPolicy}
        onSubmit={handleTriggerAlert}
        isLoading={isLoading}
      />

      <ThermalInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => {
          setIsInspectorOpen(false);
          setModalTargetPolicy(null);
        }}
        policy={modalTargetPolicy}
      />

      <AppealModal
        isOpen={isAppealOpen}
        onClose={() => {
          setIsAppealOpen(false);
          setModalTargetPolicy(null);
        }}
        policy={modalTargetPolicy}
        onSubmit={handleAppeal}
        isLoading={isLoading}
      />

    </div>
  );
};

export default App;
