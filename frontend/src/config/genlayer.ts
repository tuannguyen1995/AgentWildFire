import { formatGen, parseGenToWei } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xF22F';
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = '0x44575074343c0703C2FbAecFd0cEeF4Ac9aA831c';

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentwildfire_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42
      ) {
        return stored.trim();
      }
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentwildfire_contract_address', address.trim());
  }
}

export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.000';
}

export const STATUS_POLICY_ACTIVE = 0;
export const STATUS_ALERT_TRIGGERED = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_DISASTER_PAID = 3;
export const STATUS_SETTLED_PARTIAL_RELIEF = 4;
export const STATUS_SETTLED_FALSE_ALARM = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_EXPIRED_RECLAIMED = 7;
export const STATUS_UNRESOLVED = 8;

export interface WildfirePolicyData {
  policy_id: string;
  sponsor: string;
  beneficiary: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  forest_zone_polygon: string;
  min_frp_threshold_mw: number;
  satellite_feed_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  original_verdict: string;
  reason: string;
  confidence: number;
  measured_peak_frp_mw: number;
  burned_area_hectares: number;
  created_at_time: string;
  expires_at_time: string;
  audit_completed_time: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
}

export interface ProtocolStats {
  total_policies: number;
  total_relief_locked: string;
  total_disasters_settled: number;
  owner?: string;
}

/* -------------------------------------------------------------------------- */
/*                           GenVM Calldata Encoding                          */
/* -------------------------------------------------------------------------- */

const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
const TYPE_STR = 4;
const TYPE_ARR = 5;
const TYPE_MAP = 6;
const SPECIAL_NULL = (0 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_FALSE = (1 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_TRUE = (2 << BITS_IN_TYPE) | TYPE_SPECIAL;

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  let curData = data;
  while (curData > 0n) {
    let cur = Number(curData & 0x7fn);
    curData >>= 7n;
    if (curData > 0n) {
      cur |= 128;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, TYPE_NINT);
  }
}

function encodeMap(to: number[], arr: [string, any][]) {
  const newEntries = arr.map(([k, v]) => [
    Array.from(k, (x) => x.codePointAt(0)!),
    new TextEncoder().encode(k),
    v,
  ] as const);

  newEntries.sort((v1, v2) => {
    const l = v1[0];
    const r = v2[0];
    for (let index = 0; index < l.length && index < r.length; index++) {
      const cur = l[index] - r[index];
      if (cur !== 0) return cur;
    }
    return l.length - r.length;
  });

  encodeNumWithType(to, BigInt(newEntries.length), TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    for (const c of k) {
      to.push(c);
    }
    encodeVal(to, v);
  }
}

function encodeVal(to: number[], val: any) {
  if (val === null || val === undefined) {
    to.push(SPECIAL_NULL);
  } else if (typeof val === 'boolean') {
    to.push(val ? SPECIAL_TRUE : SPECIAL_FALSE);
  } else if (typeof val === 'number') {
    encodeNum(to, BigInt(val));
  } else if (typeof val === 'bigint') {
    encodeNum(to, val);
  } else if (typeof val === 'string') {
    const encoded = new TextEncoder().encode(val);
    encodeNumWithType(to, BigInt(encoded.length), TYPE_STR);
    for (const b of encoded) {
      to.push(b);
    }
  } else if (Array.isArray(val)) {
    encodeNumWithType(to, BigInt(val.length), TYPE_ARR);
    for (const elem of val) {
      encodeVal(to, elem);
    }
  } else if (typeof val === 'object') {
    encodeMap(to, Object.entries(val));
  } else {
    throw new Error(`Unsupported type: ${typeof val}`);
  }
}

export function encodeCalldata(method: string, args: any[]): `0x${string}` {
  const res: number[] = [];
  encodeVal(res, method);
  encodeVal(res, args);
  encodeVal(res, {});
  return `0x${res.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function readContract(
  method: string,
  args: any[] = [],
  contractAddress: string = getSavedContractAddress()
): Promise<any> {
  const calldata = encodeCalldata(method, args);
  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: calldata,
        },
        'latest',
      ],
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'GenLayer eth_call failed');
  }

  const result = data.result;
  if (!result || result === '0x') return null;

  try {
    if (typeof result === 'string' && result.startsWith('0x')) {
      const hex = result.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      const jsonStart = str.indexOf('{');
      const jsonArrStart = str.indexOf('[');
      const start = jsonStart !== -1 && (jsonArrStart === -1 || jsonStart < jsonArrStart) ? jsonStart : jsonArrStart;
      if (start !== -1) {
        return JSON.parse(str.slice(start));
      }
      return str;
    }
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export async function waitForTransactionReceipt(txHash: string, timeoutMs: number = 90000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      const txData = data?.result;

      if (txData) {
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result || '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status || '');

        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error('Transaction was canceled by GenLayer consensus (status: CANCELED).');
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error('Transaction outcome undetermined by GenLayer validators (status: UNDETERMINED).');
        }

        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            txData.error_description ||
            'Contract execution reverted on GenVM (FINISHED_WITH_ERROR)';
          throw new Error(`Transaction reverted on GenVM: ${rawError}`);
        }

        if (execResultName === 'FINISHED_WITH_RETURN' || execResultCode === '1') {
          return txData;
        }

        if (statusName === 'FINALIZED' || statusName === 'ACCEPTED' || statusCode === '7' || statusCode === '5') {
          return txData;
        }
      }

      // Check standard EVM receipt
      const recRes = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const recData = await recRes.json();
      if (recData?.result) {
        if (recData.result.status === '0x1' || recData.result.status === 1) {
          return recData.result;
        }
        if (recData.result.status === '0x0' || recData.result.status === 0) {
          throw new Error(`Transaction reverted with EVM status 0 (Tx: ${txHash})`);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('reverted') || e?.message?.includes('FINISHED_WITH_ERROR')) {
        throw e;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  throw new Error(`Transaction confirmation timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

export async function writeContract(
  contractAddress: string,
  userAddress: string,
  method: string,
  args: any[],
  valueWei: bigint = 0n
): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask to interact with GenLayer.');
  }

  const calldata = encodeCalldata(method, args);
  const valHex = valueWei > 0n ? `0x${valueWei.toString(16)}` : '0x0';

  const txHash = await (window as any).ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: userAddress,
        to: contractAddress,
        data: calldata,
        value: valHex,
      },
    ],
  });

  await waitForTransactionReceipt(txHash);
  return txHash;
}

export async function switchToStudionet(ethereum?: any): Promise<boolean> {
  const eth = ethereum || (typeof window !== 'undefined' ? (window as any).ethereum : null);
  if (!eth) return false;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer StudioNet',
            nativeCurrency: {
              name: 'GEN',
              symbol: 'GEN',
              decimals: 18,
            },
            rpcUrls: [STUDIONET_RPC_URL],
            blockExplorerUrls: [STUDIO_URL],
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error('Failed to switch to Studionet:', addError);
    }
  }
  return false;
}

export async function fetchContractStats(contractAddress: string = getSavedContractAddress()): Promise<ProtocolStats> {
  try {
    const raw = await readContract('get_stats', [], contractAddress);
    if (typeof raw === 'string') return JSON.parse(raw);
    if (raw && typeof raw === 'object') return raw;
  } catch (err) {
    console.warn('fetchContractStats error:', err);
  }
  return {
    total_policies: 0,
    total_relief_locked: '0',
    total_disasters_settled: 0,
  };
}

export async function fetchAllPolicies(contractAddress: string = getSavedContractAddress()): Promise<WildfirePolicyData[]> {
  try {
    const raw = await readContract('get_all_policies', [], contractAddress);
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(raw)) return raw;
  } catch (err) {
    console.warn('fetchAllPolicies error:', err);
  }
  return [];
}

export async function fetchPolicy(policyId: string, contractAddress: string = getSavedContractAddress()): Promise<WildfirePolicyData | null> {
  try {
    const raw = await readContract('get_policy', [policyId], contractAddress);
    if (typeof raw === 'string') return JSON.parse(raw);
    if (raw && typeof raw === 'object') return raw;
  } catch (err) {
    console.warn(`fetchPolicy(${policyId}) error:`, err);
  }
  return null;
}

export async function fetchClaimableBalance(contractAddress: string, account: string): Promise<string> {
  if (!contractAddress || !account) return '0';
  try {
    const raw = await readContract('get_claimable_balance', [account], contractAddress);
    return String(raw || '0');
  } catch (err) {
    console.warn(`fetchClaimableBalance(${account}) error:`, err);
    return '0';
  }
}

// ── Contract Write Methods ──────────────────────────────────────────

export async function createReliefPolicy(
  contractAddress: string,
  userAddress: string,
  beneficiaryAddress: string,
  forestZonePolygon: string,
  minFrpThresholdMw: number,
  durationBlocks: number,
  escrowGen: string
) {
  const weiVal = parseGenToWei(escrowGen);
  return await writeContract(
    contractAddress,
    userAddress,
    'create_relief_policy',
    [beneficiaryAddress, forestZonePolygon, minFrpThresholdMw, durationBlocks],
    weiVal
  );
}

export async function triggerWildfireAlert(
  contractAddress: string,
  userAddress: string,
  policyId: string,
  satelliteFeedUrl: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'trigger_wildfire_alert',
    [policyId, satelliteFeedUrl],
    0n
  );
}

export async function adjudicateWildfireSeverity(
  contractAddress: string,
  userAddress: string,
  policyId: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'adjudicate_wildfire_severity',
    [policyId],
    0n
  );
}

export async function appealVerdict(
  contractAddress: string,
  userAddress: string,
  policyId: string,
  disputeReason: string,
  supplementalSatelliteUrl: string,
  bondWei: bigint
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'appeal_verdict',
    [policyId, disputeReason, supplementalSatelliteUrl],
    bondWei
  );
}

export async function adjudicateAppeal(
  contractAddress: string,
  userAddress: string,
  policyId: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'adjudicate_appeal',
    [policyId],
    0n
  );
}

export async function finalizeSettlement(
  contractAddress: string,
  userAddress: string,
  policyId: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'finalize_settlement',
    [policyId],
    0n
  );
}

export async function cancelOrReclaim(
  contractAddress: string,
  userAddress: string,
  policyId: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'cancel_or_reclaim',
    [policyId],
    0n
  );
}

export async function claimPayout(
  contractAddress: string,
  userAddress: string
) {
  return await writeContract(
    contractAddress,
    userAddress,
    'claim_payout',
    [],
    0n
  );
}
