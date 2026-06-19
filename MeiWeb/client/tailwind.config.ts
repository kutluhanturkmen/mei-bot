import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mei pink accent
        mei: {
          50:  '#fdf2f6',
          100: '#fce7ef',
          200: '#fad0e1',
          300: '#f6a8c7',
          400: '#f0729f',
          500: '#e8497a',
          600: '#d42c5e',
          700: '#b21f4c',
          800: '#941e42',
          900: '#7c1e3b',
          950: '#490c1f',
        },
        // Zinc-based dark UI (MEE6-inspired)
        zinc: {
          950: '#0e0e10',
          900: '#18181b',
          850: '#1c1c1f',
          800: '#27272a',
          750: '#2d2d31',
          700: '#3f3f46',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
          50:  '#fafafa',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      backgroundImage: {
        'mei-gradient':  'linear-gradient(135deg, #f472b6 0%, #e8497a 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0e0e10 0%, #18181b 100%)',
      },
      boxShadow: {
        'mei':     '0 0 0 1px rgba(232,73,122,0.25), 0 4px 20px rgba(232,73,122,0.15)',
        'mei-sm':  '0 0 0 1px rgba(232,73,122,0.2)',
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'shimmer':    'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
}

export default config
