/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warroom: {
          950: '#06080D',
          900: '#0A0D14', // Base background
          850: '#0E131D',
          800: '#121722', // Card surface
          750: '#181F2E',
          700: '#1E273A', // Border dark
          600: '#2A364F',
        },
        plasma: {
          orange: '#F97316',
          flame: '#EF4444',
          amber: '#F59E0B',
          glow: 'rgba(249, 115, 22, 0.15)',
          redGlow: 'rgba(239, 68, 68, 0.20)',
        },
        telemetry: {
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.15)',
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.15)',
          muted: '#8B9BB4',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ember': '0 0 20px -5px rgba(249, 115, 22, 0.3)',
        'fire': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        'cyber': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame-flicker': 'flame 3s ease-in-out infinite',
      },
      keyframes: {
        flame: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        }
      }
    },
  },
  plugins: [],
};
