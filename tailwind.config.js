/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // enable dark mode using the 'dark' class
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.ts",
    "./resources/**/*.vue",
    "./resources/**/*.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
