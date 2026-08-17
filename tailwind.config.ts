import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6d28d9",
          light: "#8b5cf6",
          dark: "#4c1d95",
        },
      },
    },
  },
  plugins: [],
};
export default config;
