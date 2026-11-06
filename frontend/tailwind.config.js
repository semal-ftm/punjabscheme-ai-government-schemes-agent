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
        // Punjab-inspired accents: phulkari embroidery gold and magenta.
        gold: {
          50: "#fffaeb", 100: "#fef0c7", 200: "#fde08a", 300: "#fccb4d", 400: "#fbb424",
          500: "#f5930b", 600: "#d96d06", 700: "#b44b09", 800: "#923a0e", 900: "#78300f",
        },
        phulkari: {
          50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4", 400: "#f472b6",
          500: "#e23d8f", 600: "#c81e6f", 700: "#a3175a", 800: "#86174c", 900: "#701a42",
        },
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        urdu: ["'Noto Nastaliq Urdu'", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,29,54,0.04), 0 4px 16px rgba(20,29,54,0.06)",
        lift: "0 2px 4px rgba(20,29,54,0.05), 0 18px 40px -12px rgba(20,29,54,0.22)",
        glow: "0 0 0 1px rgba(52,211,153,0.35), 0 10px 40px -10px rgba(16,185,129,0.55)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        blob: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.08)" },
          "66%": { transform: "translate(-20px,15px) scale(0.95)" },
        },
        flow: { "0%": { left: "0%", opacity: "0" }, "10%": { opacity: "1" }, "90%": { opacity: "1" }, "100%": { left: "100%", opacity: "0" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "text-swap": { "0%": { opacity: "0", transform: "translateY(8px)" }, "12%,88%": { opacity: "1", transform: "none" }, "100%": { opacity: "0", transform: "translateY(-8px)" } },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(.2,.7,.2,1) both",
        float: "float 6s ease-in-out infinite",
        blob: "blob 14s ease-in-out infinite",
        flow: "flow 3.2s linear infinite",
        "text-swap": "text-swap 3.5s ease-in-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
