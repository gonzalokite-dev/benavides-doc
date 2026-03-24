import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          50: '#E8EBF2',
          100: '#C5CCDF',
          200: '#9FADC9',
          300: '#7A8EB3',
          400: '#556FA0',
          500: '#3A5388',
          600: '#2E4070',
          700: '#1B2A4A',
          800: '#111B30',
          900: '#080D18',
        },
        gold: {
          DEFAULT: '#C9A84C',
          50: '#FBF5E6',
          100: '#F5E7BE',
          200: '#EDD895',
          300: '#E5C96C',
          400: '#DCBA43',
          500: '#C9A84C',
          600: '#A8893A',
          700: '#876B28',
          800: '#664D16',
          900: '#452F04',
        },
        warm: {
          DEFAULT: '#F5F3EF',
          50: '#FFFFFF',
          100: '#F5F3EF',
          200: '#E8E4DC',
          300: '#D9D4C8',
          400: '#CAC3B5',
          500: '#B8B0A0',
        },
      },
      fontFamily: {
        lora: ['Lora', 'Georgia', 'serif'],
        kumbh: ['Kumbh Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        chat: '800px',
      },
    },
  },
  plugins: [],
}

export default config
