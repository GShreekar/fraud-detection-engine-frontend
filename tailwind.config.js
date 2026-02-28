/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fraud: {
          safe: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
        },
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'slide-fade': 'slide-fade 0.3s ease-out',
        'counter': 'counter 0.6s ease-out',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgb(239 68 68 / 0.5)' },
          '50%': { borderColor: 'rgb(239 68 68 / 1)' },
        },
        'slide-fade': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
