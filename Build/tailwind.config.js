/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}', // Scans HTML and TS files for Tailwind classes
    './src/Themes/*.css',   // Includes the styles.css
  ],
  theme: {
    extend: {
      // Add custom themes or utilities if needed
      colors: {
        primary: 'var(--primary-color)', // Ties to the CSS variables
      },
    },
  },
  plugins: [],
  darkMode: 'media', // Enables dark mode via prefers-color-scheme
};