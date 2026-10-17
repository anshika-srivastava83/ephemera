/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          light: 'rgb(var(--paper-light) / <alpha-value>)',
          dark: 'rgb(var(--paper-dark) / <alpha-value>)',
        },
        ivory: 'rgb(var(--ivory) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        sepia: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
        },
        rose: {
          DEFAULT: 'rgb(var(--accent-2) / <alpha-value>)',
          light: 'rgb(var(--accent-2-light) / <alpha-value>)',
          dark: 'rgb(var(--accent-2-dark) / <alpha-value>)',
        },
        olive: {
          DEFAULT: '#858875',
          light: '#A3A694',
          dark: '#666957',
        },
        graphite: '#55514B',
        danger: { DEFAULT: '#9B3B32', dark: '#7F2E27' },
        darkroom: {
          DEFAULT: '#191916',
          surface: '#23221E',
          border: '#33312B',
          glow: '#C8A39B',
        },
        polaroid: {
          DEFAULT: '#FFFCF7',
          frame: '#FBF8F1',
          ink: '#3D2F24',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Archivo', 'system-ui', 'sans-serif'],
        handwriting: ['var(--font-handwriting)', 'Reenie Beanie', 'cursive'],
      },
      boxShadow: {
        'polaroid-sm': '0 4px 10px -2px rgba(37, 35, 31, 0.08), 0 2px 4px -1px rgba(37, 35, 31, 0.04)',
        'polaroid': '0 12px 28px -6px rgba(37, 35, 31, 0.14), 0 4px 10px -2px rgba(37, 35, 31, 0.06)',
        'polaroid-lg': '0 24px 48px -10px rgba(37, 35, 31, 0.22), 0 8px 18px -4px rgba(37, 35, 31, 0.08)',
        'polaroid-dark': '0 16px 36px -6px rgba(0, 0, 0, 0.7), 0 6px 14px -2px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        'gentle-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(0.5deg)' },
        },
        'polaroid-settle': {
          '0%': { transform: 'scale(0.92) translateY(24px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'float': 'gentle-float 6s ease-in-out infinite',
        'settle': 'polaroid-settle 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
