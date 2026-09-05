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
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-scale": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "checkout-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-right": "fade-in-right 0.5s ease-out forwards",
        "fade-scale": "fade-scale 0.5s ease-out forwards",
        "checkout-shake": "checkout-shake 0.45s ease-in-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".hit-test-fix": {
          transform: "translateZ(0)",
          "-webkit-transform": "translateZ(0)",
          backfaceVisibility: "hidden",
          "-webkit-backface-visibility": "hidden",
          willChange: "transform",
        },
        ".animate-delay-0": { animationDelay: "0ms" },
        ".animate-delay-150": { animationDelay: "150ms" },
        ".animate-delay-300": { animationDelay: "300ms" },
        ".animate-delay-450": { animationDelay: "450ms" },
      });
    },
  ],
}
