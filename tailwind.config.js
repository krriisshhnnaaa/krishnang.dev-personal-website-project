module.exports = {
  content: [
    "./index.html",
    "./Interactive-Elements/**/*.js",
    "./*.js",
    "./CSS/**/*.css",
    "./blog/**/*.md"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#030712',
          surface: '#080e1e',
          card: 'rgba(13, 20, 36, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(0, 242, 254, 0.35)',
        },
        cyber: {
          cyan: '#00f2fe',
          blue: '#38bdf8',
          neon: '#00ffff',
          purple: '#a855f7',
          violet: '#8b5cf6',
          magenta: '#ec4899',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 242, 254, 0.25)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.3)',
        'card-cyber': '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'levitate': 'levitate 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'conic-spin': 'conicSpin 6s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'radar-ping': 'radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        levitate: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        conicSpin: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        radarPing: {
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
