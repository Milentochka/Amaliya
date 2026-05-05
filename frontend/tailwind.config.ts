import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-comfortaa)", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm cream backgrounds
        cream: {
          50: "#fdfaf5",
          100: "#faf2e7",
          200: "#f4e8d4",
          300: "#ecdac0",
          400: "#dcc4a3",
        },
        // Dusty rose / powder accents
        blush: {
          100: "#fbe8e0",
          200: "#f5d8cb",
          300: "#ecc1b0",
          400: "#dca696",
          500: "#c4897a",
          600: "#a86f60",
          700: "#8a574a",
        },
        // Warm grays / browns for text
        mocha: {
          300: "#c2b1a3",
          400: "#a08e80",
          500: "#7d6c5f",
          700: "#574a40",
          900: "#3b322c",
        },
      },
      boxShadow: {
        soft: "0 6px 24px -8px rgba(168, 111, 96, 0.18)",
        gentle: "0 2px 12px -4px rgba(168, 111, 96, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
