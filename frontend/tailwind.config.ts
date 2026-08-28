import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A0F1E",
          900: "#1A2340",
          800: "#2A3A6E",
        },
        cyan: "#00D4FF",
        "risk-red": "#FF4D6D",
        "safe-green": "#00C896",
        amber: "#F7A800",
        card: {
          900: "#1A2340",
        },
        elevated: {
          900: "#2A3A6E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      keyframes: {
        penaltyPulse: {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(0, 212, 255, 0.4)",
          },
          "50%": {
            boxShadow: "0 0 0 12px rgba(0, 212, 255, 0)",
          },
        },
      },
      animation: {
        "penalty-pulse": "penaltyPulse 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
