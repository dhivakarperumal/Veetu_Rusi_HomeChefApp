/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./example/**/*.{js,jsx,ts,tsx}",
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        display: "'Spline Sans', 'Inter', ui-sans-serif, system-ui, sans-serif",
        mono: "ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        rounded:
          "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
      },
      colors: {
        expo: {
          light: "#3C9FFE",
          dark: "#0274DF",
          splash: "#208AEF",
        },
      },
    },
  },
  plugins: [],
};
