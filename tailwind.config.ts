import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Channel-based CSS vars so the whole palette can flip light/dark.
        // Values live in globals.css under :root (dark) and .light.
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          card: "rgb(var(--ink-card) / <alpha-value>)",
          line: "rgb(var(--ink-line) / <alpha-value>)",
        },
        mist: {
          DEFAULT: "rgb(var(--mist) / <alpha-value>)",
          dim: "rgb(var(--mist-dim) / <alpha-value>)",
          faint: "rgb(var(--mist-faint) / <alpha-value>)",
        },
        sage: {
          DEFAULT: "rgb(var(--sage) / <alpha-value>)",
          deep: "rgb(var(--sage-deep) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--amber) / <alpha-value>)",
        },
        rose: {
          DEFAULT: "rgb(var(--rose) / <alpha-value>)",
        },
        // Premium palette — only resolves under .pro (see globals.css), so these
        // classes are inert on the classic tree even though they exist globally.
        lux: {
          bg: "rgb(var(--lux-bg) / <alpha-value>)",
          bg2: "rgb(var(--lux-bg-2) / <alpha-value>)",
          card: "rgb(var(--lux-card) / <alpha-value>)",
          card2: "rgb(var(--lux-card-2) / <alpha-value>)",
          line: "rgb(var(--lux-line) / <alpha-value>)",
          text: "rgb(var(--lux-text) / <alpha-value>)",
          dim: "rgb(var(--lux-dim) / <alpha-value>)",
          faint: "rgb(var(--lux-faint) / <alpha-value>)",
          violet: "rgb(var(--lux-violet) / <alpha-value>)",
          sage: "rgb(var(--lux-sage) / <alpha-value>)",
          amber: "rgb(var(--lux-amber) / <alpha-value>)",
          rose: "rgb(var(--lux-rose) / <alpha-value>)",
          cyan: "rgb(var(--lux-cyan) / <alpha-value>)",
          coral: "rgb(var(--lux-coral) / <alpha-value>)",
        },
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
        // reference @keyframes defined in globals.css (.pro scope)
        float: "lux-float 5s ease-in-out infinite",
        shimmer: "lux-shimmer 2.5s linear infinite",
        glow: "lux-glow 3.5s ease-in-out infinite",
        pop: "lux-pop 0.42s cubic-bezier(0.22,1,0.36,1) both",
        bob: "lux-bob 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
