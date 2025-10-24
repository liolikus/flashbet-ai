/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'linera-blue': '#0066CC',
        'linera-dark': '#1a1a2e',
      },
    },
  },
  plugins: [],
}
