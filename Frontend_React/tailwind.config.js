/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#08090c',
        darkCard: '#11131a',
        'gray-850': '#1b1d28',
        'gray-880': '#12131a',
        neonGreen: '#00FF66',
        neonRed: '#FF3366',
        neonYellow: '#FFCC00',
        neonCyan: '#00E5FF'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace']
      }
    },
  },
  plugins: [],
}
