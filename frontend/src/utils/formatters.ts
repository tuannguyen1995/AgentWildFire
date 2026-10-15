export function formatGen(val: string | number | bigint, decimals: number = 3): string {
  try {
    let bigVal: bigint;
    if (typeof val === 'string') {
      if (val.startsWith('0x')) {
        bigVal = BigInt(val);
      } else {
        bigVal = BigInt(val);
      }
    } else if (typeof val === 'number') {
      bigVal = BigInt(Math.floor(val));
    } else {
      bigVal = val;
    }

    const whole = bigVal / 1000000000000000000n;
    const rem = bigVal % 1000000000000000000n;
    const remStr = rem.toString().padStart(18, '0').slice(0, decimals);
    return `${whole.toString()}.${remStr}`;
  } catch (err) {
    return '0.000';
  }
}

export function parseGenToWei(genStr: string | number): bigint {
  try {
    const s = String(genStr).trim();
    if (!s) return 0n;
    const parts = s.split('.');
    const whole = BigInt(parts[0] || '0') * 1000000000000000000n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(18, '0').slice(0, 18);
      return whole + BigInt(frac);
    }
    return whole;
  } catch (e) {
    return 0n;
  }
}

export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= startChars + endChars) return clean;
  return `${clean.slice(0, startChars)}...${clean.slice(-endChars)}`;
}

export function formatDate(timestamp: string | number | bigint): string {
  try {
    const num = Number(timestamp);
    if (!num || num === 0) return 'N/A';
    // If in seconds (< 10^11), multiply by 1000
    const ms = num < 10000000000 ? num * 1000 : num;
    return new Date(ms).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (err) {
    return 'N/A';
  }
}

export interface StatusMeta {
  code: number;
  label: string;
  badgeClass: string;
  borderClass: string;
  accentClass: string;
  description: string;
}

export function getStatusMeta(status: number): StatusMeta {
  switch (status) {
    case 0:
      return {
        code: 0,
        label: 'ACTIVE / MONITORED',
        badgeClass: 'bg-telemetry-cyan/15 text-telemetry-cyan border-telemetry-cyan/30',
        borderClass: 'border-telemetry-cyan/30',
        accentClass: 'text-telemetry-cyan',
        description: 'Sponsor locked relief escrow. Forest zone active under satellite surveillance.',
      };
    case 1:
      return {
        code: 1,
        label: 'ALERT TRIGGERED',
        badgeClass: 'bg-plasma-orange/20 text-plasma-orange border-plasma-orange/40 animate-pulse',
        borderClass: 'border-plasma-orange/40',
        accentClass: 'text-plasma-orange',
        description: 'Thermal anomaly filed. Satellite telemetry queued for AI Tribunal.',
      };
    case 2:
      return {
        code: 2,
        label: 'AWAITING PAYOUT',
        badgeClass: 'bg-plasma-amber/20 text-plasma-amber border-plasma-amber/40',
        borderClass: 'border-plasma-amber/40',
        accentClass: 'text-plasma-amber',
        description: 'AI thermal jury rendered verdict. 72s cooling-off challenge window active.',
      };
    case 3:
      return {
        code: 3,
        label: 'DISASTER SETTLED (100%)',
        badgeClass: 'bg-plasma-flame/20 text-plasma-flame border-plasma-flame/40',
        borderClass: 'border-plasma-flame/40',
        accentClass: 'text-plasma-flame',
        description: 'Severe wildfire breach verified. 100% relief escrow dispatched to beneficiaries.',
      };
    case 4:
      return {
        code: 4,
        label: 'PARTIAL RELIEF (40%)',
        badgeClass: 'bg-plasma-amber/20 text-plasma-amber border-plasma-amber/40',
        borderClass: 'border-plasma-amber/40',
        accentClass: 'text-plasma-amber',
        description: 'Spot fire contained. 40% relief paid to beneficiary, 60% preserved for sponsor.',
      };
    case 5:
      return {
        code: 5,
        label: 'FALSE ALARM (REFUNDED)',
        badgeClass: 'bg-telemetry-emerald/20 text-telemetry-emerald border-telemetry-emerald/40',
        borderClass: 'border-telemetry-emerald/40',
        accentClass: 'text-telemetry-emerald',
        description: 'Controlled burn or false alarm. 100% escrow refunded to sponsor.',
      };
    case 6:
      return {
        code: 6,
        label: 'UNDER DISPUTE',
        badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse',
        borderClass: 'border-purple-500/40',
        accentClass: 'text-purple-400',
        description: 'Appealed with 10% staked bond. Supreme Appellate Tribunal reviewing supplemental logs.',
      };
    case 7:
      return {
        code: 7,
        label: 'EXPIRED / RECLAIMED',
        badgeClass: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
        borderClass: 'border-slate-800',
        accentClass: 'text-slate-400',
        description: 'Coverage completed without wildfire incidents. Escrow safely reclaimed by sponsor.',
      };
    case 8:
      return {
        code: 8,
        label: 'UNRESOLVED (PROTECTED)',
        badgeClass: 'bg-rose-900/30 text-rose-300 border-rose-700/50',
        borderClass: 'border-rose-900/40',
        accentClass: 'text-rose-400',
        description: 'Satellite endpoint unreachable or canary failure. Escrow preserved in non-settling lock.',
      };
    default:
      return {
        code: status,
        label: 'UNKNOWN',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
        borderClass: 'border-slate-800',
        accentClass: 'text-slate-400',
        description: 'Unknown state.',
      };
  }
}
