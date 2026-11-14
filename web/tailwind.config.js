/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: { 950: '#04070d', 900: '#080d17', 800: '#0e1624', 700: '#18233a', 600: '#2a3a5a' },
        sun: '#f5b642',
        earth: '#4ea8ff',
        both: '#4ade80',
        terrain: '#3b4659',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
