import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome core system
        surface: {
          0: "#000000",
          1: "#0a0a0a",
          2: "#111111",
          3: "#1a1a1a",
          4: "#222222",
          5: "#2d2d2d",
        },
        // Legacy aliases — remapped to black/white for the makeover
        navy: {
          DEFAULT: "#000000",
          50: "#f5f5f5",
          100: "#0a0a0a",
          200: "#111111",
          300: "#1f1f1f",
          400: "#2d2d2d",
          500: "#404040",
        },
        // cyan → white (semantic: "primary accent" is now white)
        cyan: {
          DEFAULT: "#ffffff",
          light: "#e5e5e5",
          dark: "#a3a3a3",
        },
        slate: {
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        // Functional / data colors — preserved exactly
        risk: { DEFAULT: "#FF4D6D", dark: "#CC3D57", light: "#FF8099" },
        safe: { DEFAULT: "#00C896", dark: "#009A74", light: "#66DFBE" },
        amber: { DEFAULT: "#F7A800", dark: "#C48600", light: "#FFCC66" },
        signal: { DEFAULT: "#B8FF3D", dark: "#8FCC1E", dim: "rgba(184,255,61,0.15)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.05em",
        tighter: "-0.035em",
        tight: "-0.02em",
      },
      keyframes: {
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-up-reveal": {
          from: { opacity: "0", transform: "translateY(60px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,255,255,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(255,255,255,0.06)" },
        },
        "pulse-glow-risk": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,77,109,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(255,77,109,0.3)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "grid-fade": {
          "0%, 100%": { opacity: "0.04" },
          "50%": { opacity: "0.08" },
        },
      },
      animation: {
        "count-up": "count-up 0.4s ease-out both",
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-in-right": "slide-in-right 0.3s ease-out both",
        "slide-up-reveal": "slide-up-reveal 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "pulse-glow-risk": "pulse-glow-risk 2.5s ease-in-out infinite",
        "marquee": "marquee 40s linear infinite",
        "grid-fade": "grid-fade 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
