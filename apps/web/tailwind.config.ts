import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: { "13": "3.25rem", "18": "4.5rem" },
      colors: {
        iocl: {
          orange: "#F36F21",
          "orange-deep": "#D95512",
          navy: "#0B1B4D",
          "navy-soft": "#172B63",
          cream: "#FFF8F2",
          green: "#14915B",
          red: "#C7352E",
        },
      },
      boxShadow: {
        panel: "0 20px 55px rgba(11, 27, 77, 0.10)",
        glow: "0 12px 40px rgba(243, 111, 33, 0.22)",
      },
      borderRadius: {
        "2.5xl": "1.5rem",
      },
      animation: {
        "fade-up": "fadeUp .45s ease-out both",
        scan: "scan 2.2s ease-in-out infinite",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "50%": { transform: "translateY(220px)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
