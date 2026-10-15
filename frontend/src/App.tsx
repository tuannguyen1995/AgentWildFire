import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Flame, 
  Satellite, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Info,
  Radio,
  Sparkles,
  Zap
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { PolicyCard } from './components/PolicyCard';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { TriggerAlertModal } from './components/TriggerAlertModal';
import { ThermalInspectorModal } from './components/ThermalInspectorModal';
import { AppealModal } from './components/AppealModal';
import { PullPayoutButton } from './components/PullPayoutButton';
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

export const App: React.FC = () => {
  // Wallet & Connection state
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000');
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Contract data state
  const [stats, setStats] = useState<ProtocolStats>({
    total_policies: 0,
    total_relief_locked: '0',
    total_disasters_settled: 0,
  });
  const [policies, setPolicies] = useState<WildfirePolicyData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isTriggerOpen, setIsTriggerOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = useState<boolean>(false);
  const [activePolicy, setActivePolicy] = useState<WildfirePolicyData | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
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
        showToast('success', `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        refreshBalances(accounts[0]);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Wallet connection cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances
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

  // Load on-chain data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, policiesData] = await Promise.all([
        fetchContractStats(contractAddress),
        fetchAllPolicies(contractAddress),
      ]);
      setStats(statsData);
      setPolicies(policiesData);

      if (account) {
        await refreshBalances(account);
      }
    } catch (err) {
      console.warn('Data load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, account]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
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
      const tx = await createReliefPolicy(
        contractAddress,
        account,
        data.beneficiary,
        data.polygon,
        data.minFrp,
        data.durationBlocks,
        data.escrowGen
      );
      showToast('success', 'Relief Escrow successfully locked on Studionet!');
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
      showToast('success', `Wildfire alert filed for Policy #${policyId}. Ready for AI Satellite Jury!`);
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
    showToast('info', 'AI Satellite Jury cross-examining thermal telemetry...');
    try {
      await adjudicateWildfireSeverity(contractAddress, account, policyId);
      showToast('success', `AI Adjudication completed for Policy #${policyId}!`);
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
      showToast('success', `Appeal filed for Policy #${policyId} with 10% staked dispute bond.`);
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
      showToast('success', `Appellate Tribunal decision recorded for Policy #${policyId}!`);
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
      showToast('success', `Settlement finalized for Policy #${policyId}. Funds disbursed!`);
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
      showToast('success', `Expired escrow reclaimed for Policy #${policyId}!`);
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
      showToast('success', 'Relief funds claimed successfully to your wallet!');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Claim failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered & Searched Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      // Filter tab
      if (selectedFilter === 'active' && p.status !== 0) return false;
      if (selectedFilter === 'alert' && p.status !== 1) return false;
      if (selectedFilter === 'awaiting' && p.status !== 2) return false;
      if (selectedFilter === 'disputed' && p.status !== 6) return false;
      if (selectedFilter === 'settled' && p.status !== 3 && p.status !== 4) return false;
      if (selectedFilter === 'refunded' && p.status !== 5 && p.status !== 7) return false;
      if (selectedFilter === 'unresolved' && p.status !== 8) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = p.policy_id.includes(q);
        const matchesSponsor = p.sponsor.toLowerCase().includes(q);
        const matchesBen = p.beneficiary.toLowerCase().includes(q);
        const matchesPoly = p.forest_zone_polygon.toLowerCase().includes(q);
        const matchesVerdict = p.verdict.toLowerCase().includes(q);
        return matchesId || matchesSponsor || matchesBen || matchesPoly || matchesVerdict;
      }

      return true;
    });
  }, [policies, selectedFilter, searchQuery]);

  const activeCount = useMemo(() => policies.filter((p) => p.status === 0).length, [policies]);
  const disputedCount = useMemo(() => policies.filter((p) => p.status === 6).length, [policies]);

  return (
    <div className="min-h-screen bg-warroom-900 text-slate-100 flex flex-col grid-radar">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-2xl border flex items-center space-x-3 animate-in slide-in-from-top-4 duration-200 ${
          notification.type === 'success'
            ? 'bg-telemetry-emerald/20 border-telemetry-emerald/50 text-emerald-200'
            : notification.type === 'error'
            ? 'bg-rose-950/90 border-rose-600 text-rose-200'
            : 'bg-warroom-800 border-plasma-orange text-orange-200'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-telemetry-emerald" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />}
          {notification.type === 'info' && <Radio className="w-5 h-5 flex-shrink-0 text-plasma-orange animate-pulse" />}
          <span className="text-xs font-medium">{notification.message}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        account={account}
        onConnect={connectWallet}
        balance={balance}
        claimableBalance={claimableBalance}
        onClaim={handleClaimPayout}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Pull Payment Action Banner (if funds buffered) */}
        <PullPayoutButton
          claimableBalance={claimableBalance}
          onClaim={handleClaimPayout}
          isLoading={isLoading}
        />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-warroom-800 via-warroom-850 to-warroom-900 border border-warroom-700/80 p-8 md:p-10 mb-8 shadow-2xl">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-plasma-orange/15 border border-plasma-orange/30 text-plasma-orange text-xs font-medium mb-4">
              <Satellite className="w-3.5 h-3.5" />
              <span>Earth Observation Oracles &bull; GenLayer Studionet</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight text-white mb-4 leading-tight">
              Autonomous Satellite Wildfire Detection & <span className="text-transparent bg-clip-text bg-gradient-to-r from-plasma-orange via-plasma-flame to-rose-400">Parametric Relief Escrow</span>
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 font-sans">
              Traditional disaster relief is delayed by bureaucratic paperwork while communities burn. <strong className="text-white">AgentWildFire</strong> replaces paperwork with <strong className="text-plasma-orange">GenLayer Intelligent Contracts</strong>: locks parametric escrow, renders live NASA FIRMS / Copernicus infrared radiance telemetry on-chain via <code className="text-telemetry-cyan font-mono text-xs">gl.nondet.web.render</code>, and releases 100% relief funds in minutes.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-semibold text-sm shadow-ember transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize Parametric Relief Policy</span>
              </button>

              <a
                href={`${STUDIO_URL}/contracts/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-warroom-800 border border-warroom-700 hover:border-slate-500 text-slate-200 text-sm font-medium transition-all"
              >
                <span>View Intelligent Contract</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Decorative radar background */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden lg:flex items-center justify-center">
            <Flame className="w-96 h-96 text-plasma-orange" />
          </div>
        </div>

        {/* High-Level Protocol Statistics */}
        <StatsOverview
          stats={stats}
          totalPoliciesCount={policies.length}
          activeCount={activeCount}
          disputedCount={disputedCount}
        />

        {/* Policy Explorer & War Room Controls */}
        <div className="space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-warroom-700/60">
            <div>
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <Satellite className="w-5 h-5 text-plasma-orange" />
                <span>Wildfire Thermal War Room & Surveillance Grid</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live geofenced forest polygons monitored via NASA FIRMS & Sentinel satellites
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, polygon, address..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-warroom-800 border border-warroom-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-plasma-orange"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Policies', count: policies.length },
              { id: 'active', label: 'Surveillance Active', count: policies.filter(p => p.status === 0).length },
              { id: 'alert', label: 'Alert Triggered', count: policies.filter(p => p.status === 1).length },
              { id: 'awaiting', label: 'Awaiting Settlement', count: policies.filter(p => p.status === 2).length },
              { id: 'disputed', label: 'Under Dispute', count: policies.filter(p => p.status === 6).length },
              { id: 'settled', label: 'Disaster Paid', count: policies.filter(p => p.status === 3 || p.status === 4).length },
              { id: 'refunded', label: 'False Alarm / Reclaimed', count: policies.filter(p => p.status === 5 || p.status === 7).length },
              { id: 'unresolved', label: 'Protected Unresolved', count: policies.filter(p => p.status === 8).length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  selectedFilter === f.id
                    ? 'bg-plasma-orange text-white shadow-ember font-semibold'
                    : 'bg-warroom-800 text-slate-300 hover:bg-warroom-700 border border-warroom-700/80'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedFilter === f.id ? 'bg-white/20 text-white' : 'bg-warroom-900 text-slate-400'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Policies Grid */}
          {filteredPolicies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPolicies.map((policy) => (
                <PolicyCard
                  key={policy.policy_id}
                  policy={policy}
                  userAddress={account}
                  onOpenTriggerAlert={(p) => {
                    setActivePolicy(p);
                    setIsTriggerOpen(true);
                  }}
                  onOpenInspector={(p) => {
                    setActivePolicy(p);
                    setIsInspectorOpen(true);
                  }}
                  onOpenAppeal={(p) => {
                    setActivePolicy(p);
                    setIsAppealOpen(true);
                  }}
                  onAdjudicate={handleAdjudicate}
                  onAdjudicateAppeal={handleAdjudicateAppeal}
                  onFinalize={handleFinalize}
                  onReclaim={handleReclaim}
                  isLoading={isLoading}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 px-4 bg-warroom-800/40 border border-warroom-700/60 rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-plasma-orange/15 border border-plasma-orange/30 flex items-center justify-center text-plasma-orange mx-auto mb-4">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                No Parametric Relief Policies Found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                {searchQuery || selectedFilter !== 'all'
                  ? 'No policies match your search query or selected filter criteria.'
                  : 'No forest canopy relief escrow pools have been initialized on Studionet yet. Create the first policy to begin autonomous satellite surveillance.'}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-plasma-orange to-plasma-flame hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs shadow-ember transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize First Relief Policy</span>
              </button>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-warroom-700/60 bg-warroom-850/60 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-plasma-orange" />
            <span className="font-heading font-bold text-slate-200">AgentWildFire Protocol</span>
            <span>&bull;</span>
            <span>GenLayer StudioNet (Chain ID: 61999)</span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <a
              href={`${STUDIO_URL}/contracts/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-plasma-orange transition-colors"
            >
              Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-plasma-orange transition-colors"
            >
              GenLayer Docs
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
          setActivePolicy(null);
        }}
        policy={activePolicy}
        onSubmit={handleTriggerAlert}
        isLoading={isLoading}
      />

      <ThermalInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => {
          setIsInspectorOpen(false);
          setActivePolicy(null);
        }}
        policy={activePolicy}
      />

      <AppealModal
        isOpen={isAppealOpen}
        onClose={() => {
          setIsAppealOpen(false);
          setActivePolicy(null);
        }}
        policy={activePolicy}
        onSubmit={handleAppeal}
        isLoading={isLoading}
      />

    </div>
  );
};

export default App;
