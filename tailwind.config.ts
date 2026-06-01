import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#08080f",
          800: "#0c0c16",
          700: "#11111f",
          600: "#171728",
        },
        ink: {
          DEFAULT: "#f3f1ff",
          dim: "#a7a3c4",
          faint: "#6c6890",
        },
        violet: {
          DEFAULT: "#8b7dff",
          bright: "#a89bff",
          deep: "#5b4ee0",
        },
        teal: {
          DEFAULT: "#27e1a6",
          deep: "#10b886",
        },
        amber: {
          DEFAULT: "#ffc15e",
        },
        rose: {
          DEFAULT: "#ff6b9a",
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
        glow: "0 0 0 1px rgba(139,125,255,0.15), 0 8px 40px -8px rgba(139,125,255,0.35)",
        "glow-teal": "0 0 0 1px rgba(39,225,166,0.15), 0 8px 40px -8px rgba(39,225,166,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(139,125,255,0.12), transparent 60%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
        "spin-slow": "spin-slow 18s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
