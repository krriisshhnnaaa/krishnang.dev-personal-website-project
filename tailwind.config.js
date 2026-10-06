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
          bg: '#0a1424',
          surface: '#0f1d33',
          card: 'rgba(16, 31, 56, 0.75)',
          border: 'rgba(166, 189, 223, 0.12)',
          glow: 'rgba(92, 157, 245, 0.35)',
          peach: '#eaccb6',
          'peach-glow': 'rgba(234, 204, 182, 0.35)',
        },
        slate: {
          50: '#f8fafc',
          100: '#f0f4fc',
          200: '#dbe6f8',
          300: '#b8cced',
          400: '#8ba8d4',
          500: '#5c82ba',
          600: '#3a639b',
          700: '#264a7c',
          800: '#19355b',
          900: '#10223a',
          950: '#0a1424',
        },
        cyan: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7ec4fc',
          400: '#5c9df5',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#173660',
          950: '#0c1a2e',
        },
        purple: {
          50: '#fdf8f5',
          100: '#f9ede4',
          200: '#f3dac8',
          300: '#eaccb6',
          400: '#f0b892',
          500: '#e89a6c',
          600: '#d47c4b',
          700: '#b35f33',
          800: '#8f4a27',
          900: '#5c2e17',
          950: '#36190b',
        },
        pink: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#e5737d',
          500: '#e0535e',
          600: '#c53030',
          700: '#9b1c1c',
          800: '#771d1d',
          900: '#4f1717',
          950: '#2b0b0e',
        },
        cyber: {
          cyan: '#5c9df5',
          blue: '#3b82f6',
          neon: '#7ec4fc',
          purple: '#eaccb6',
          violet: '#f0b892',
          magenta: '#e89a6c',
          emerald: '#48bb78',
          amber: '#e89a6c',
          rose: '#e0535e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(92, 157, 245, 0.3)',
        'glow-purple': '0 0 30px rgba(234, 204, 182, 0.3)',
        'glow-emerald': '0 0 25px rgba(72, 187, 120, 0.3)',
        'card-cyber': '0 12px 36px rgba(5, 10, 20, 0.65), inset 0 1px 0 rgba(234, 204, 182, 0.12)',
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
