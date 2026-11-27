import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Neutral blue-black surfaces so violet and gold stay accents.
        bg: {
          DEFAULT: "#0b0b13",
          soft: "#12121b",
        },
        card: "#171722",
        border: {
          DEFAULT: "#2a2a38",
        },
        // Gold = actions and prices. Violet (below) = the OSCAR brand colour.
        gold: {
          DEFAULT: "#e8b64a",
          soft: "#f5d78e",
        },
        violet: {
          DEFAULT: "#6d4df2",
          soft: "#a58bff",
        },
        coin: "#e8b64a",
        ink: {
          DEFAULT: "#d9d5ea",
          muted: "#9791b2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
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
