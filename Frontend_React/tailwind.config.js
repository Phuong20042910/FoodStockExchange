/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f17',
        darkCard: '#131926',
        'gray-850': '#1e293b',
        'gray-880': '#0f172a',
        neonGreen: '#10b981',
        neonRed: '#f43f5e',
        neonYellow: '#f59e0b',
        neonCyan: '#38bdf8'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['Share Tech Mono', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}

