import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ],
        mono: ['"Cascadia Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      colors: {
        // Skala netral sedikit kebiruan agar permukaan terasa lembut dan tidak abu-abu pekat
        slate: {
          50: '#f7f8fb',
          100: '#eef0f6',
          200: '#e0e4ee',
          300: '#c9cfde',
          400: '#98a1b8',
          500: '#6b7590',
          600: '#4e5871',
          700: '#3a4258',
          800: '#252b3d',
          900: '#151a29',
          950: '#0b1020'
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        conflict: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337'
        }
      },
      boxShadow: {
        soft: '0 1px 2px rgb(11 16 32 / 0.04), 0 4px 16px -4px rgb(11 16 32 / 0.08)',
        float: '0 10px 40px -10px rgb(11 16 32 / 0.35)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        drop: {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        pop: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(244 63 94 / 0.5)' },
          '100%': { boxShadow: '0 0 0 6px rgb(244 63 94 / 0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        rise: 'rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        drop: 'drop 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        pop: 'pop 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite'
      }
    }
  },
  plugins: []
} satisfies Config
