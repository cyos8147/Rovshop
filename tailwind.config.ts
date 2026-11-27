import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Soft royal-purple theme: a lighter, calmer background than pure
        // black so gold buttons and glass panels stand out.
        bg: {
          DEFAULT: "#221a44",
          soft: "#2c2357",
        },
        card: "#2f2660",
        border: {
          DEFAULT: "#4a3d86",
        },
        gold: {
          DEFAULT: "#f5b93f",
          soft: "#ffd77a",
        },
        violet: {
          DEFAULT: "#8b6cff",
          soft: "#b9a4ff",
        },
        ink: {
          DEFAULT: "#f7f4ff",
          muted: "#bdb3e0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 28px rgba(139, 108, 255, 0.35)",
        goldGlow: "0 6px 28px rgba(245, 185, 63, 0.35)",
        panel: "0 10px 40px rgba(10, 6, 30, 0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 15% 10%, rgba(185,164,255,0.22), transparent 45%), radial-gradient(circle at 85% 0%, rgba(255,120,200,0.16), transparent 40%)",
      },
    },
  },
  plugins: [],
};

export default config;
