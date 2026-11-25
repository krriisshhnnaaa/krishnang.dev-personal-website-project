/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./Interactive-Elements/**/*.js",
    "./*.js",
    "./CSS/**/*.css",
    "./blog/**/*.md"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          deep: '#07080d',
          page: '#0b0d14',
          card: '#11141c',
          raised: '#1a1e28',
          border: 'rgba(238, 240, 245, 0.08)',
          text: '#eef0f5',
          secondary: '#a3a9b8',
          muted: '#7a8296',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
        },
        brand: {
          bg: '#0b0d14',
          surface: '#11141c',
          card: '#11141c',
          border: 'rgba(238, 240, 245, 0.08)',
          raised: '#1a1e28',
          accent: '#3b82f6',
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
          950: '#0b0d14',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.35)',
        'elevated': '0 12px 32px rgba(0, 0, 0, 0.45)',
      },
      transitionTimingFunction: {
        'unslop': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}
