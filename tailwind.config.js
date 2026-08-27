/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#FAF7F2',
        sheet: '#FFFFFF',
        rule: { DEFAULT: '#E8E3DC', soft: '#F2EEE8' },
        accent: { DEFAULT: '#F97316', hover: '#EA6A08', press: '#C2410C', tint: '#FEF3E9', text: '#9A3412' },
        ink: { DEFAULT: '#1A1A1A', body: '#4B5158', muted: '#6B7280', faint: '#9AA0A6' },
        ok: { DEFAULT: '#16A34A', tint: '#DCFCE7', text: '#15803D' },
        caution: { DEFAULT: '#B45309', tint: '#FEF6E7', text: '#92400E' },
        stop: { DEFAULT: '#B42318', tint: '#FEEDEC', text: '#912018' },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
};
