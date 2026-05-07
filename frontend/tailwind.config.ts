import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['GeistVariable', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      colors: {
        // Page / shell backgrounds
        canvas:  '#FAFAF9',
        surface: '#FFFFFF',
        subtle:  '#F7F6F3',
        hover:   'rgba(0,0,0,0.03)',

        // Borders
        line: {
          DEFAULT: '#E8E7E5',
          strong:  '#D4D3CF',
        },

        // Text hierarchy
        ink: {
          1: '#1A1A1A',
          2: '#575553',
          3: '#8B8985',
          4: '#C4C3C0',
        },

        // Brand
        primary: {
          DEFAULT: '#5B5BD6',
          hover:   '#4F4FBF',
          light:   'rgba(91,91,214,0.08)',
          fg:      '#FFFFFF',
        },

        // Functional
        success:  '#16A34A',
        warning:  '#D97706',
        danger:   '#DC2626',
        amber:    '#D97706',
        // Citation — used for inline citation references and generating states
        citation: '#D97706',
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'base':['13px', { lineHeight: '20px' }],
        'md':  ['14px', { lineHeight: '22px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '56px' }],
      },

      borderRadius: {
        sm:     '4px',
        DEFAULT:'6px',
        md:     '8px',
        lg:     '10px',
        xl:     '12px',
        '2xl':  '16px',
      },

      boxShadow: {
        sm:    '0 1px 2px rgba(0,0,0,0.05)',
        card:  '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        md:    '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        lg:    '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
        modal: '0 24px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
      },

      animation: {
        'fade-in':  'fadeIn 0.15s ease',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':  'shimmer 1.6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
} satisfies Config
