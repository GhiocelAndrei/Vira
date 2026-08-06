import type { Config } from "tailwindcss";
import { colors, fontFamily, fontSize, borderRadius } from "@vira/core/tokens";

/**
 * "Lumina Dark". The tokens live in `@vira/core` so the Expo app consumes the
 * exact same values through NativeWind — a colour changes in one place, and the
 * two surfaces cannot drift apart silently.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
      borderRadius,
      spacing: { sidebar: "280px", gutter: "24px", section: "64px" },
      maxWidth: { container: "1440px" },
      boxShadow: {
        "video-glow": "0 0 80px -20px rgba(202, 190, 255, 0.15)",
        /* One glow per audience colour, so a file-wide primary → business /
           creator swap resolves every class it touches. */
        "primary-glow": "0 4px 24px -4px rgba(202, 190, 255, 0.25)",
        "business-glow": "0 4px 24px -4px rgba(128, 168, 255, 0.25)",
        "creator-glow": "0 4px 24px -4px rgba(148, 125, 255, 0.25)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "fade-up": "fade-up 240ms ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
