/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./store/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["var(--font-sora)", "system-ui", "sans-serif"],
        mono:  ["var(--font-jb)",   "monospace"],
      },
    },
  },
  plugins: [],
};
