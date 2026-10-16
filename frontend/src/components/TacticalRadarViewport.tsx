import React, { useState, useEffect, useRef } from 'react';
import { 
  Satellite, 
  Flame, 
  MapPin, 
  Radio, 
  Layers, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Crosshair, 
  Activity, 
  Terminal,
  ShieldAlert,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { WildfirePolicyData } from '../config/genlayer';
import { getStatusMeta } from '../utils/formatters';

interface TacticalRadarViewportProps {
  policies: WildfirePolicyData[];
  selectedPolicy: WildfirePolicyData | null;
  onSelectPolicy: (policy: WildfirePolicyData) => void;
  onOpenTriggerAlert: (policy: WildfirePolicyData) => void;
  onOpenInspector: (policy: WildfirePolicyData) => void;
}

// Preset geofenced wildfire hotspots mapped onto SVG coordinate space [0, 800] x [0, 480]
const PRESET_LOCATIONS: Record<string, { x: number; y: number; name: string; region: string; lat: string; lon: string }> = {
  california: { x: 180, y: 165, name: 'Sierra Nevada (Butte Co)', region: 'North America', lat: '39.75°N', lon: '121.32°W' },
  amazon: { x: 300, y: 310, name: 'Amazon Basin (Acre/Madre)', region: 'South America', lat: '09.82°S', lon: '67.85°W' },
  mediterranean: { x: 460, y: 175, name: 'Evia Forest Corridor', region: 'Southern Europe', lat: '38.85°N', lon: '23.45°E' },
  australia: { x: 690, y: 350, name: 'Blue Mountains Bushland', region: 'Australasia', lat: '33.51°S', lon: '150.32°E' },
};

function matchLocation(polygon: string) {
  const p = polygon.toLowerCase();
  if (p.includes('-121') || p.includes('39') || p.includes('california')) return PRESET_LOCATIONS.california;
  if (p.includes('-68') || p.includes('-10') || p.includes('amazon') || p.includes('acre')) return PRESET_LOCATIONS.amazon;
  if (p.includes('23') || p.includes('38') || p.includes('greece') || p.includes('evia')) return PRESET_LOCATIONS.mediterranean;
  if (p.includes('150') || p.includes('-33') || p.includes('australia')) return PRESET_LOCATIONS.australia;
  // Default hash positioning
  const hash = p.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    x: 150 + (hash % 500),
    y: 120 + ((hash * 7) % 250),
    name: 'Geofenced Forest Zone',
    region: 'Earth Observation Grid',
    lat: '37.50°N',
    lon: '119.20°W',
  };
}

export const TacticalRadarViewport: React.FC<TacticalRadarViewportProps> = ({
  policies,
  selectedPolicy,
  onSelectPolicy,
  onOpenTriggerAlert,
  onOpenInspector,
}) => {
  const [viewMode, setViewMode] = useState<'thermal' | 'burn' | 'smoke'>('thermal');
  const [crosshairPos, setCrosshairPos] = useState({ x: 380, y: 210 });
  const [crosshairTelemetry, setCrosshairTelemetry] = useState({
    lat: '39.75°N',
    lon: '121.32°W',
    frp: 420.5,
    tempK: 384.2,
    sensor: 'MODIS-Terra SLSTR-NRT',
  });
  const [radarActive, setRadarActive] = useState(true);
  const [satellitePos, setSatellitePos] = useState(0);

  // Satellite orbit animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setSatellitePos((prev) => (prev + 1) % 800);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 800);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 450);
    setCrosshairPos({ x, y });

    // Derive simulated GPS coords from SVG position
    const latDeg = (90 - (y / 450) * 180).toFixed(2);
    const lonDeg = (-180 + (x / 800) * 360).toFixed(2);
    const pseudoFRP = Math.max(15, Math.round(((x * y) % 650) * 1.2));
    const pseudoTemp = (295 + (pseudoFRP / 4)).toFixed(1);

    setCrosshairTelemetry({
      lat: `${Math.abs(Number(latDeg))}°${Number(latDeg) >= 0 ? 'N' : 'S'}`,
      lon: `${Math.abs(Number(lonDeg))}°${Number(lonDeg) >= 0 ? 'E' : 'W'}`,
      frp: pseudoFRP,
      tempK: Number(pseudoTemp),
      sensor: x % 2 === 0 ? 'Sentinel-3 SLSTR' : 'NASA VIIRS 375m',
    });
  };

  return (
    <div className="relative bg-warroom-900 border border-warroom-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full hud-bracket">
      
      {/* Viewport Top Tactical Toolbar */}
      <div className="px-5 py-3.5 bg-warroom-950/90 border-b border-warroom-700/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Viewport Status & Modes */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-warroom-850 border border-warroom-700 font-mono text-[11px] text-telemetry-cyan font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-telemetry-cyan" />
            <span>RADAR: {radarActive ? 'SWEEPING' : 'PAUSED'}</span>
          </div>

          <div className="flex items-center bg-warroom-850 border border-warroom-700 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setViewMode('thermal')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'thermal'
                  ? 'bg-plasma-orange text-white font-semibold shadow-ember'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Thermal Infrared (FRP)
            </button>
            <button
              onClick={() => setViewMode('burn')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'burn'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Multispectral NBR Scar
            </button>
            <button
              onClick={() => setViewMode('smoke')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'smoke'
                  ? 'bg-telemetry-cyan text-slate-950 font-semibold shadow-cyber'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Smoke & AOD Mask
            </button>
          </div>
        </div>

        {/* Right: Satellites in Field of View */}
        <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Satellite className="w-3.5 h-3.5 text-plasma-orange" />
            <span className="text-slate-200">SENTINEL-3A:</span>
            <span className="text-telemetry-emerald font-semibold">PASS IN ORBIT</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5">
            <span className="text-slate-500">|</span>
            <span className="text-slate-200">RESOLUTION:</span>
            <span className="text-telemetry-cyan">375m I-Band</span>
          </div>
        </div>

      </div>

      {/* Main Tactical SVG Canvas */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] bg-warroom-950 overflow-hidden cursor-crosshair">
        
        {/* Radar Circular Sweep Beam Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[600px] h-[600px] rounded-full border border-telemetry-cyan/20 flex items-center justify-center">
            <div className="w-[450px] h-[450px] rounded-full border border-telemetry-cyan/20 flex items-center justify-center">
              <div className="w-[300px] h-[300px] rounded-full border border-telemetry-cyan/25 flex items-center justify-center">
                <div className="w-[150px] h-[150px] rounded-full border border-telemetry-cyan/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Radar Rotating Sweep Arm */}
        {radarActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="w-[700px] h-[700px] rounded-full animate-radar-sweep radar-sweep-beam opacity-40" />
          </div>
        )}

        {/* Tactical SVG Map Overlay */}
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full relative z-10"
          onMouseMove={handleMouseMove}
        >
          <defs>
            {/* Thermal Hotspot Radial Gradient */}
            <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#F97316" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#EF4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </radialGradient>

            {/* Polygon Area Pattern */}
            <pattern id="polyGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="16" y2="16" stroke="rgba(249, 115, 22, 0.2)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Graticule Latitude & Longitude Grid Lines */}
          <g stroke="rgba(30, 41, 64, 0.5)" strokeWidth="0.8" strokeDasharray="3 3">
            <line x1="0" y1="90" x2="800" y2="90" />
            <line x1="0" y1="180" x2="800" y2="180" />
            <line x1="0" y1="270" x2="800" y2="270" />
            <line x1="0" y1="360" x2="800" y2="360" />

            <line x1="160" y1="0" x2="160" y2="450" />
            <line x1="320" y1="0" x2="320" y2="450" />
            <line x1="480" y1="0" x2="480" y2="450" />
            <line x1="640" y1="0" x2="640" y2="450" />
          </g>

          {/* Abstract World Landmass Contours */}
          <g fill="rgba(17, 24, 39, 0.7)" stroke="rgba(43, 57, 89, 0.6)" strokeWidth="1">
            {/* North America */}
            <path d="M 120 70 L 220 60 L 250 110 L 220 180 L 190 220 L 170 200 L 140 180 L 110 130 Z" />
            {/* South America */}
            <path d="M 260 230 L 320 250 L 340 330 L 300 400 L 280 340 L 250 280 Z" />
            {/* Europe & Africa */}
            <path d="M 420 80 L 480 75 L 500 130 L 470 170 L 450 160 L 420 120 Z" />
            <path d="M 440 190 L 510 200 L 520 290 L 470 360 L 440 280 L 430 220 Z" />
            {/* Asia & Australia */}
            <path d="M 520 80 L 680 70 L 730 140 L 680 220 L 590 200 L 540 140 Z" />
            <path d="M 640 290 L 730 280 L 740 350 L 670 380 L 640 340 Z" />
          </g>

          {/* Satellite Orbit Path Trajectory Line */}
          <path
            d="M 0 100 Q 200 40, 400 220 T 800 340"
            fill="none"
            stroke="rgba(6, 182, 212, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Moving Satellite Point */}
          <circle cx={satellitePos} cy={100 + Math.sin(satellitePos / 100) * 120} r="4" fill="#06B6D4" className="animate-ping" />
          <circle cx={satellitePos} cy={100 + Math.sin(satellitePos / 100) * 120} r="3" fill="#FFFFFF" />

          {/* Render Geofenced Forest Zones & Wildfire Policies */}
          {policies.map((policy) => {
            const loc = matchLocation(policy.forest_zone_polygon);
            const isSelected = selectedPolicy?.policy_id === policy.policy_id;
            const isAlarm = policy.status === 3 || policy.status === 1 || policy.status === 2;
            const frp = policy.measured_peak_frp_mw || policy.min_frp_threshold_mw;

            return (
              <g
                key={policy.policy_id}
                onClick={() => onSelectPolicy(policy)}
                className="cursor-pointer group"
              >
                {/* Geofence Polygon Box */}
                <rect
                  x={loc.x - 30}
                  y={loc.y - 25}
                  width="60"
                  height="50"
                  fill="url(#polyGrid)"
                  stroke={isSelected ? '#F97316' : isAlarm ? '#EF4444' : '#06B6D4'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeDasharray={isSelected ? 'none' : '4 2'}
                  rx="4"
                  className="transition-all duration-300 group-hover:stroke-plasma-orange"
                />

                {/* Hotspot Core Heat Signature */}
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={isAlarm ? '18' : '10'}
                  fill="url(#hotspotGlow)"
                  className={isAlarm ? 'animate-pulse' : ''}
                />
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r="3.5"
                  fill="#FFFFFF"
                />

                {/* Tactical Label Pill */}
                <g transform={`translate(${loc.x - 45}, ${loc.y + 32})`}>
                  <rect
                    width="90"
                    height="18"
                    rx="3"
                    fill="rgba(8, 12, 20, 0.9)"
                    stroke={isSelected ? '#F97316' : 'rgba(30, 41, 64, 0.9)'}
                    strokeWidth="1"
                  />
                  <text
                    x="45"
                    y="12"
                    textAnchor="middle"
                    fill={isAlarm ? '#EF4444' : '#06B6D4'}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    #{policy.policy_id} • {frp} MW
                  </text>
                </g>
              </g>
            );
          })}

          {/* Mouse Crosshair Overlay */}
          <g pointerEvents="none">
            <line x1={crosshairPos.x} y1="0" x2={crosshairPos.x} y2="450" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="0.8" strokeDasharray="2 2" />
            <line x1="0" y1={crosshairPos.y} x2="800" y2={crosshairPos.y} stroke="rgba(6, 182, 212, 0.35)" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle cx={crosshairPos.x} cy={crosshairPos.y} r="16" fill="none" stroke="rgba(249, 115, 22, 0.6)" strokeWidth="1" />
            <circle cx={crosshairPos.x} cy={crosshairPos.y} r="2" fill="#F97316" />
          </g>
        </svg>

        {/* Live HUD Telemetry Crosshair Overlay HUD (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 bg-warroom-900/90 backdrop-blur-md border border-warroom-700/80 rounded-2xl p-3.5 shadow-2xl font-mono text-[11px] space-y-1.5 max-w-xs pointer-events-none">
          <div className="flex items-center justify-between text-telemetry-cyan font-semibold border-b border-warroom-700/60 pb-1">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              <span>RADAR CROSSHAIR TELEMETRY</span>
            </span>
            <span className="text-slate-400 text-[10px]">LIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
            <div>
              <span className="text-slate-500">COORDS: </span>
              <span className="text-white font-bold">{crosshairTelemetry.lat}, {crosshairTelemetry.lon}</span>
            </div>
            <div>
              <span className="text-slate-500">FRP: </span>
              <span className="text-plasma-orange font-bold">{crosshairTelemetry.frp} MW</span>
            </div>
            <div>
              <span className="text-slate-500">TEMP: </span>
              <span className="text-slate-200">{crosshairTelemetry.tempK} K</span>
            </div>
            <div>
              <span className="text-slate-500">SENSOR: </span>
              <span className="text-telemetry-emerald">{crosshairTelemetry.sensor}</span>
            </div>
          </div>
        </div>

        {/* Zoom & Radar Control Buttons (Bottom-Right) */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-2">
          <button
            onClick={() => setRadarActive(!radarActive)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
              radarActive
                ? 'bg-telemetry-cyan/20 border-telemetry-cyan text-telemetry-cyan shadow-cyber'
                : 'bg-warroom-800 border-warroom-700 text-slate-400'
            }`}
          >
            {radarActive ? 'SWEEP: ON' : 'SWEEP: OFF'}
          </button>
        </div>

      </div>

      {/* Terminal Stream / Satellite Downlink Packet Log */}
      <div className="px-5 py-2.5 bg-warroom-950 border-t border-warroom-700/70 flex items-center justify-between font-mono text-[11px] text-slate-400">
        <div className="flex items-center space-x-2 truncate">
          <Terminal className="w-3.5 h-3.5 text-telemetry-cyan flex-shrink-0" />
          <span className="text-slate-500">[NONDET WEB.RENDER]</span>
          <span className="text-slate-300 truncate">
            {selectedPolicy?.satellite_feed_url
              ? `STREAMING: ${selectedPolicy.satellite_feed_url}`
              : 'LISTENING: firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/...'}
          </span>
        </div>

        {selectedPolicy && (
          <button
            onClick={() => onOpenInspector(selectedPolicy)}
            className="flex items-center space-x-1 text-plasma-orange hover:underline font-semibold flex-shrink-0 ml-3"
          >
            <span>Inspect Forensic Dossier</span>
          </button>
        )}
      </div>

    </div>
  );
};
