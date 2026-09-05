import siteThemeTokens from "./scripts/postcss/siteThemeTokens.js";

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Must run last: maps the Bear Lane palette to runtime CSS variables.
    "./scripts/postcss/siteThemeTokens.js": {},
  },
}
