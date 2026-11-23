/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        danfo: {
          yellow: '#FFCC00',
          amber: '#FF9500',
          ink: '#0D0C10',
          red: '#FF2E2E',
          asphalt: '#24222A',
        }
      },
      fontFamily: {
        display: ['"Impact"', '"Arial Black"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
