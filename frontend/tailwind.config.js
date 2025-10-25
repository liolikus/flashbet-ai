/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Epilogue', 'system-ui', 'sans-serif'],
        'heading': ['Epilogue', 'system-ui', 'sans-serif'],
        'body': ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Linera Brand Colors - Primary
        'linera': {
          'black-800': '#0A1F27',
          'black-700': '#0F2832',
          'black-500': '#1C3640',
          'grey-100': '#EDEDF9',
          'grey-150': '#DBDCE8',
          'grey-200': '#C8CBD6',
          'white': '#FFFFFF',
          'blue-300': '#A4ABFF',
          'blue-400': '#8D96FF',
          'red-100': '#FFD9D0',
          'red-500': '#F35F3F',
          'red-700': '#E34826',
          'red-800': '#DE2A02',
        },
      },
    },
  },
  plugins: [],
}
