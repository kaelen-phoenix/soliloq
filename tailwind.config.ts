import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf3f7",
          100: "#fbe6ef",
          200: "#f6c2da",
          300: "#f09ec4",
          400: "#e2569a",
          500: "#d31f74",
          600: "#b0165f",
          700: "#8c114b",
          800: "#690d38",
          900: "#460925",
        },
        ink: {
          900: "#1a1523",
          700: "#3a3245",
          500: "#6b6275",
          300: "#a79fb0",
          100: "#ece7f0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
