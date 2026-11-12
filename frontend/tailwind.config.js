/** @type {import('tailwindcss').Config} */
// Warm "heritage" theme: cream paper, forest green, plum accents, ink text.
// `navy`, `emerald` and `slate` are remapped so every existing page picks up the new look.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ink (text, dark surfaces)
        navy: {
          50: "#f7f4ee", 100: "#ede7dc", 200: "#ddd3c3", 300: "#c2b5a0", 400: "#9c8e78",
          500: "#7a6d5a", 600: "#5f5446", 700: "#4a4137", 800: "#37302a", 900: "#26211c", 950: "#17130f",
        },
        // forest green (primary)
        emerald: {
          50: "#f0f5ec", 100: "#dfe9d6", 200: "#c3d6b4", 300: "#9fbd89", 400: "#79a062",
          500: "#5a8546", 600: "#446c35", 700: "#36582b", 800: "#2c4724", 900: "#243a1f",
        },
        // warm stone neutrals
        slate: {
          50: "#faf7f2", 100: "#f3eee5", 200: "#e8e0d2", 300: "#d6cbb8", 400: "#a99d89",
          500: "#857a68", 600: "#685e4f", 700: "#4f473c", 800: "#39332b", 900: "#26221d",
        },
        // plum / rose (secondary accent)
        plum: {
          50: "#fbf2f5", 100: "#f5e1e8", 200: "#ebc5d2", 300: "#dc9fb4", 400: "#c47a95",
          500: "#a85c7a", 600: "#8e4864", 700: "#763a52", 800: "#5f2f43", 900: "#4d2838",
        },
        gold: { 50: "#fbf5e6", 100: "#f5e6c0", 300: "#e2c27a", 400: "#d4a64a", 500: "#c08f2f", 600: "#9d7224" },
        cream: { 50: "#fffdf9", 100: "#fbf7f0", 200: "#f6f0e4", 300: "#efe6d5" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Lora", "Georgia", "serif"],
        urdu: ["'Noto Nastaliq Urdu'", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(60,45,25,0.04), 0 4px 18px rgba(60,45,25,0.06)",
        lift: "0 2px 4px rgba(60,45,25,0.05), 0 12px 32px rgba(60,45,25,0.10)",
      },
    },
  },
  plugins: [],
};
