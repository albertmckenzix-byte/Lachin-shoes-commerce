import tailwindcss from 'tailwindcss'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#ffffff',
        'accent-yellow': '#FFC83D',
        'muted-gray': '#6b6b6b',
        sand: '#E8E0CF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}