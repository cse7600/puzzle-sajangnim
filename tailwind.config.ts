import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9fe870',
        'primary-dark': '#163300',
        'primary-hover': '#cdffad',
        ink: '#0e0f0c',
        parchment: '#e8ebe6',
        'canvas-white': '#ffffff',
        'canvas-subtle': '#f5f5f7',
        'dark-tile': '#0e0f0c',
        muted: '#454745',
        'muted-light': '#868685',
        hairline: '#e0e0e0',
        'accent-bg': '#e2f6d5',
        'accent-text': '#054d28',
      },
      fontSize: {
        hero: ['56px', { lineHeight: '1.07', letterSpacing: '-0.5px', fontWeight: '900' }],
        display: ['40px', { lineHeight: '1.1', letterSpacing: '-0.5px', fontWeight: '900' }],
        section: ['34px', { lineHeight: '1.12', letterSpacing: '-0.5px', fontWeight: '900' }],
        tagline: ['21px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['17px', { lineHeight: '1.47', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        nav: ['12px', { lineHeight: '1.3', fontWeight: '400' }],
      },
      borderRadius: {
        pill: '9999px',
        lg: '24px',
        md: '11px',
        sm: '8px',
      },
      fontFamily: {
        pretendard: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      maxWidth: {
        content: '980px',
        wide: '1440px',
      },
      spacing: {
        section: '80px',
      },
    },
  },
  plugins: [],
};

export default config;
