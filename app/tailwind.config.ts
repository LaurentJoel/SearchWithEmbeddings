import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom color palette - Professional document-centric design
      colors: {
        // Primary - Navy (trust, professionalism)
        primary: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#1a2744",
          950: "#102a43",
        },
        // Secondary - Warm cream (paper, documents)
        cream: {
          50: "#fdfcfb",
          100: "#faf8f5",
          200: "#f5f0e8",
          300: "#ebe4d8",
          400: "#ddd4c4",
          500: "#cfc3af",
          600: "#b8a88e",
          700: "#9a8b70",
          800: "#7d7058",
          900: "#655a47",
        },
        // Accent - Burgundy (highlights, actions)
        accent: {
          50: "#fdf2f2",
          100: "#fde8e8",
          200: "#fbd5d5",
          300: "#f8b4b4",
          400: "#f27474",
          500: "#a54848",
          600: "#8b3a3a",
          700: "#722f2f",
          800: "#5c2626",
          900: "#4a1f1f",
        },
        // Semantic colors
        success: {
          DEFAULT: "#2d5a3d",
          light: "#d1fae5",
        },
        warning: {
          DEFAULT: "#8b6914",
          light: "#fef3c7",
        },
        error: {
          DEFAULT: "#8b2929",
          light: "#fee2e2",
        },
      },
      // Typography
      fontFamily: {
        heading: ["Merriweather", "Georgia", "serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      // Spacing and sizing
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      // Box shadows - subtle, professional
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.03)",
      },
      // Animations
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
