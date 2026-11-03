/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f4fa", 100: "#e2e8f3", 200: "#c5d0e6", 300: "#9aaed2", 400: "#6a84b8",
          500: "#48629c", 600: "#364b80", 700: "#2c3c68", 800: "#1f2b4d", 900: "#141d36", 950: "#0b1124",
        },
        emerald: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399",
          500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        urdu: ["'Noto Nastaliq Urdu'", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,29,54,0.04), 0 4px 16px rgba(20,29,54,0.06)",
      },
    },
  },
  plugins: [],
};
