/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'dark-green': '#0F2E19',
        'cream':      '#F5F1E8',
        'gold':       '#DBA03C'
      }
    }
  },
  plugins: [],
}
