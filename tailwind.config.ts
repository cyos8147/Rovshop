import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a14",
          soft: "#12121f",
        },
        card: "#181828",
        border: {
          DEFAULT: "#2a2a40",
        },
        gold: {
          DEFAULT: "#e8b64a",
          soft: "#f5d78e",
        },
        violet: {
          DEFAULT: "#7c5cff",
          soft: "#a58bff",
        },
        ink: {
          DEFAULT: "#f2f2f7",
          muted: "#9a9ab0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(124, 92, 255, 0.25)",
        goldGlow: "0 0 24px rgba(232, 182, 74, 0.25)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 20% 20%, rgba(124,92,255,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(232,182,74,0.18), transparent 40%), linear-gradient(180deg, #0a0a14 0%, #0a0a14 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
