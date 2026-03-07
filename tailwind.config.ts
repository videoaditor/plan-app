import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: {
          bg: "var(--canvas-bg)",
          grid: "var(--canvas-grid)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          hover: "var(--surface-hover)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          blue: "#2563EB",
          yellow: "#F5D547",
          pink: "#EC4899",
          red: "#EF4444",
          teal: "#14B8A6",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        float: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        "float-lg": "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 150ms ease",
        "slide-up": "slideUp 200ms ease",
        "scale-in": "scaleIn 150ms ease",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
