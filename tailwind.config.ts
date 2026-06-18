import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',
        ink: '#1d1d1f',
        parchment: '#f5f5f7',
        'canvas-white': '#ffffff',
        'dark-tile': '#272729',
        muted: '#6e6e73',
        hairline: '#e0e0e0',
      },
      fontSize: {
        hero: ['56px', { lineHeight: '1.07', letterSpacing: '-0.28px', fontWeight: '600' }],
        display: ['40px', { lineHeight: '1.1', letterSpacing: '-0.2px', fontWeight: '600' }],
        section: ['34px', { lineHeight: '1.12', letterSpacing: '-0.17px', fontWeight: '600' }],
        tagline: ['21px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['17px', { lineHeight: '1.47', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        nav: ['12px', { lineHeight: '1.3', fontWeight: '400' }],
      },
      borderRadius: {
        pill: '9999px',
        lg: '18px',
        md: '11px',
        sm: '8px',
      },
      fontFamily: {
        apple: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Inter',
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
