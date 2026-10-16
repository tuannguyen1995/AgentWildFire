/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warroom: {
          950: '#04070D', // Deep space cockpit black
          900: '#080C14', // Base console background
          850: '#0C111C', // Card & panel surface
          800: '#111726', // Elevated widget surface
          750: '#172033', // Active item background
          700: '#1E2940', // Tactical border line
          600: '#2B3959',
          500: '#3D507A',
        },
        plasma: {
          orange: '#F97316',
          flame: '#EF4444',
          amber: '#F59E0B',
          glow: 'rgba(249, 115, 22, 0.20)',
          redGlow: 'rgba(239, 68, 68, 0.25)',
        },
        thermal: {
          deep: '#3B0764',
          infrared: '#9333EA',
          blaze: '#DC2626',
          fire: '#EA580C',
          solar: '#FACC15',
          white: '#FEF08A',
        },
        telemetry: {
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.25)',
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.20)',
          muted: '#8B9BB4',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ember': '0 0 25px -5px rgba(249, 115, 22, 0.35)',
        'fire': '0 0 30px -5px rgba(239, 68, 68, 0.45)',
        'cyber': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'radar': '0 0 40px rgba(6, 182, 212, 0.15)',
        'hud': 'inset 0 0 20px rgba(6, 182, 212, 0.05), 0 0 20px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'radar-sweep': 'radarSweep 5s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame-flicker': 'flame 2.5s ease-in-out infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        flame: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.82', transform: 'scale(1.03)' },
        },
      },
    },
  },
  plugins: [],
};
