import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          ink: "var(--signal-ink)",
          mist: "var(--signal-mist)",
          foam: "var(--signal-foam)",
          bg: "var(--signal-bg)",
          accent: "var(--signal-accent)",
          accentDeep: "var(--signal-accent-deep)",
          accentSoft: "var(--signal-accent-soft)",
          teal: "var(--signal-teal)",
          tealSoft: "var(--signal-teal-soft)",
          sky: "var(--signal-sky)",
          skySoft: "var(--signal-sky-soft)",
          warn: "#b45309",
          line: "var(--signal-line)",
          muted: "var(--signal-muted)",
          card: "#ffffff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.03), 0 10px 30px -14px rgba(20, 54, 58, 0.12)",
        glass: "0 10px 28px -10px color-mix(in srgb, var(--signal-accent) 50%, transparent)",
        orb: "0 14px 34px -10px color-mix(in srgb, var(--signal-accent) 55%, transparent)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.92)", opacity: "0.7" },
          "70%": { transform: "scale(1.18)", opacity: "0" },
          "100%": { transform: "scale(1.18)", opacity: "0" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        "loader-rise": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "loader-glow": {
          "0%, 100%": { opacity: "0.45", transform: "translate(-50%, -50%) scale(0.92)" },
          "50%": { opacity: "0.9", transform: "translate(-50%, -50%) scale(1.08)" },
        },
        "loader-shimmer": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        "loader-spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "typing-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "orb-breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.045)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "14%": { transform: "scale(1.07)" },
          "28%": { transform: "scale(1)" },
          "42%": { transform: "scale(1.11)" },
          "70%": { transform: "scale(1)" },
        },
        "heartbeat-ring": {
          "0%": { transform: "scale(0.92)", opacity: "0.55" },
          "35%": { transform: "scale(1.22)", opacity: "0" },
          "36%, 100%": { transform: "scale(0.92)", opacity: "0" },
        },
        "heartbeat-ring-late": {
          "0%, 18%": { transform: "scale(0.92)", opacity: "0" },
          "19%": { transform: "scale(0.92)", opacity: "0.45" },
          "55%": { transform: "scale(1.32)", opacity: "0" },
          "56%, 100%": { transform: "scale(0.92)", opacity: "0" },
        },
        "chat-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "chat-in-right": {
          "0%": { opacity: "0", transform: "translateY(10px) translateX(8px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) translateX(0) scale(1)" },
        },
        "spoke": {
          "0%, 100%": { transform: "scaleY(0.45)" },
          "50%": { transform: "scaleY(1)" },
        },
        "modal-backdrop": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "modal-panel": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "wave-bar": "wave-bar 1s ease-in-out infinite",
        "loader-rise": "loader-rise 0.45s ease-out both",
        "loader-glow": "loader-glow 2.8s ease-in-out infinite",
        "loader-shimmer": "loader-shimmer 1.35s ease-in-out infinite",
        "loader-spin-slow": "loader-spin-slow 8s linear infinite",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
        "orb-breathe": "orb-breathe 3.2s ease-in-out infinite",
        heartbeat: "heartbeat 1.45s ease-in-out infinite",
        "heartbeat-ring": "heartbeat-ring 1.45s ease-out infinite",
        "heartbeat-ring-late": "heartbeat-ring-late 1.45s ease-out infinite",
        "chat-in": "chat-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both",
        "chat-in-right": "chat-in-right 0.38s cubic-bezier(0.22, 1, 0.36, 1) both",
        spoke: "spoke 0.9s ease-in-out infinite",
        "modal-backdrop": "modal-backdrop 0.22s ease-out both",
        "modal-panel": "modal-panel 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
