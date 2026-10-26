import type { Config } from "tailwindcss";

// Night-table palette: deep blue-black, lit surfaces, Gambit green as the
// brand and the colour of money. Blue is you, amber is them, red is trouble.
const table = { DEFAULT: "#05070c", 2: "#0a0f18" };
const card = { DEFAULT: "#0e131c", 2: "#141a25", 3: "#1c2330" };
const rule = { DEFAULT: "rgba(255,255,255,0.08)", strong: "rgba(255,255,255,0.14)" };
const ink = { DEFAULT: "#f2f5f8", soft: "#9ba5b4", faint: "#5f6878" };
const you = { DEFAULT: "#5aa9ff", bright: "#9cc9ff", deep: "#2d6fd1" };
const them = { DEFAULT: "#ffb547", deep: "#c47d14" };
const won = { DEFAULT: "#3ee09b", bright: "#7bf5c1", deep: "#139a62" };
const alert = { DEFAULT: "#ff5d6c", deep: "#c8323f" };

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        table,
        card,
        rule,
        ink: { ...ink, dim: ink.soft },
        you,
        them,
        won,
        alert,
        gold: "#ffd66b",
        felt: { DEFAULT: "#0d5b3c", deep: "#06301f" },
        whot: { red: "#a3162e", deep: "#6e0f20", cream: "#f6efe1", paper: "#ece3d0" },

        // the names most components were written with, mapped onto the palette
        void: { DEFAULT: table.DEFAULT, 900: table.DEFAULT, 800: table[2], 700: card.DEFAULT, 600: card[2] },
        line: { DEFAULT: rule.DEFAULT, strong: rule.strong },
        teal: { DEFAULT: won.DEFAULT, deep: won.deep },
        violet: you,
        amber: { DEFAULT: them.DEFAULT },
        rose: { DEFAULT: alert.DEFAULT },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        micro: ["13px", "18px"],
        small: ["14px", "20px"],
        body: ["16px", "24px"],
      },
      borderRadius: {
        chip: "12px",
        tile: "24px",
        sheet: "30px",
        "4xl": "2rem",
      },
      boxShadow: {
        lift: "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -24px rgba(0,0,0,0.9)",
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -24px rgba(0,0,0,0.9)",
        pop: "0 40px 80px -30px rgba(0,0,0,0.95)",
        glow: "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,60,35,0.35), 0 12px 28px -12px rgba(62,224,155,0.75)",
        "glow-teal": "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,60,35,0.35), 0 12px 28px -12px rgba(62,224,155,0.75)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
