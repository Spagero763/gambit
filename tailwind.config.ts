import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Near-black, slightly cool base + elevated surfaces.
        void: {
          DEFAULT: "#0a0a0c",
          800: "#101013",
          700: "#16161a",
          600: "#1e1e23",
        },
        ink: {
          DEFAULT: "#f4f4f5",
          dim: "#9a9aa3",
          faint: "#646470",
        },
        // Hairline borders/dividers. These were referenced app-wide but never
        // defined, so Tailwind fell back to its light-gray default — harsh
        // bright borders on a dark UI. Defining them refines every surface.
        line: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.16)",
        },
        // Matured, low-neon hues. Emerald (`teal`) is the brand / money accent.
        violet: {
          DEFAULT: "#8e8bf0",
          bright: "#aaa7ff",
          deep: "#5d58c9",
        },
        teal: {
          DEFAULT: "#3ecf8e",
          deep: "#1f9d6b",
        },
        amber: {
          DEFAULT: "#e3b341",
        },
        rose: {
          DEFAULT: "#e06c8b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Realistic, grounded shadows — no neon bloom.
        card: "0 1px 2px rgba(0,0,0,0.4), 0 12px 28px -16px rgba(0,0,0,0.8)",
        pop: "0 2px 6px rgba(0,0,0,0.5), 0 24px 48px -24px rgba(0,0,0,0.9)",
        // Subtle green lift reserved for the single primary action.
        glow: "0 1px 2px rgba(0,0,0,0.5), 0 10px 26px -14px rgba(31,157,107,0.5)",
        "glow-teal": "0 1px 2px rgba(0,0,0,0.5), 0 10px 26px -14px rgba(31,157,107,0.5)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
