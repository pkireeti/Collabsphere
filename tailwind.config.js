/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* --- world --- */
        night: '#0A0F24',
        panel: {
          DEFAULT: '#141C36',
          light: '#1D2849',
          dark: '#0C1226',
        },
        line: '#35436E',
        cream: '#F4F1E4',
        mist: {
          DEFAULT: '#A9B6D9',
          dim: '#7382AB',
        },
        /* --- actions / identity (sky + orange, pixel-tuned) --- */
        sky: {
          DEFAULT: '#3EC8F2',
          deep: '#0E86B4',
          pale: '#123A56',
          light: '#0F2A45',
        },
        brand: {
          DEFAULT: '#3EC8F2',
          dark: '#0E86B4',
          light: '#0F2A45',
        },
        flame: {
          DEFAULT: '#F2761A',
          dark: '#FFB067',
          light: '#3A2312',
        },
        /* --- status --- */
        pixgreen: {
          DEFAULT: '#4CD07A',
          dark: '#7EE6A2',
          light: '#123324',
        },
        pixred: {
          DEFAULT: '#F0506A',
          dark: '#FF92A4',
          light: '#3A1520',
        },
        pixamber: {
          DEFAULT: '#F5C542',
          dark: '#FFDF8A',
          light: '#3A3116',
        },
        /* --- legacy aliases (kept so shared utilities still resolve) --- */
        ink: {
          DEFAULT: '#070B18',
          soft: '#A9B6D9',
          mute: '#7382AB',
        },
        paper: '#0A0F24',
        red: {
          DEFAULT: '#F0506A',
          dark: '#FF92A4',
          light: '#3A1520',
        },
        emerald: {
          DEFAULT: '#4CD07A',
          dark: '#7EE6A2',
          light: '#123324',
        },
        amber: {
          DEFAULT: '#F5C542',
          dark: '#FFDF8A',
          light: '#3A3116',
        },
      },
      fontFamily: {
        /* Press Start 2P = headings, labels, buttons, nav */
        sans: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        /* VT323 = body copy, paragraphs, form fields */
        body: ['VT323', '"Press Start 2P"', 'ui-monospace', 'monospace'],
        mono: ['VT323', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'px-xs': ['11px', { lineHeight: '16px' }],
        'px-sm': ['14px', { lineHeight: '20px' }],
        'px-base': ['17px', { lineHeight: '24px' }],
        'px-lg': ['20px', { lineHeight: '28px' }],
        'px-xl': ['26px', { lineHeight: '36px' }],
        'px-2xl': ['34px', { lineHeight: '44px' }],
      },
      letterSpacing: {
        poster: '0',
        label: '0.08em',
      },
      boxShadow: {
        /* hard, offset, no blur — classic pixel UI */
        card: '4px 4px 0 0 #05070F',
        lift: '6px 6px 0 0 #05070F',
        press: '2px 2px 0 0 #05070F',
        band: 'inset 0 -3px 0 0 #05070F',
        inset: 'inset 3px 3px 0 0 #05070F',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(224px)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.22s steps(4, end) both',
        'fade-in': 'fade-in 0.15s steps(3, end) both',
        'scale-in': 'scale-in 0.18s steps(3, end) both',
        blink: 'blink 1s steps(2, end) infinite',
        scanline: 'scanline 1.6s steps(8, end) infinite',
        bob: 'bob 1.2s steps(2, end) infinite',
      },
    },
  },
  plugins: [],
}
