import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['GeistVariable', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:    ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif:   ['"Instrument Serif"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },

      colors: {
        /* Backgrounds — warm neutral */
        base:    '#141414',
        surface: '#1C1C1C',
        raised:  '#222222',
        overlay: '#2A2A2A',

        border: {
          DEFAULT: '#2E2E2E',
          strong:  '#3D3D3D',
        },

        primary: {
          DEFAULT: '#6366F1',
          hover:   '#5558E3',
          dim:     'rgba(99,102,241,0.12)',
          fg:      '#ffffff',
        },

        citation: {
          DEFAULT: '#F59E0B',
          dim:     'rgba(245,158,11,0.12)',
          hover:   '#D97706',
        },

        text: {
          1: '#E8E8E8',
          2: '#A0A0A0',
          3: '#636363',
          4: '#404040',
        },

        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'base':['13px', { lineHeight: '20px' }],
        'md':  ['14px', { lineHeight: '22px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
      },

      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        md:  '10px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },

      boxShadow: {
        card:    '0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
        raised:  '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        modal:   '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        primary: '0 0 20px rgba(99,102,241,0.2)',
      },

      animation: {
        'fade-in':    'fadeIn 0.2s ease forwards',
        'slide-up':   'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'spin-slow':  'spin 2s linear infinite',
      },

      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
} satisfies Config
