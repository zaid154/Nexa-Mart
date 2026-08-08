/** @type {import('tailwindcss').Config} */

// NexaMart "Bazaar" theme — Flipkart-style bright blue primary on white,
// amber/orange CTA accents, green rating/discount, cool grey neutrals.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        xl: "2rem",
      },
    },
    extend: {
      colors: {
        // Cool grey neutrals (text, borders, muted surfaces).
        ink: {
          50: "#f7f8fa",
          100: "#eef1f5",
          200: "#dbe0e8",
          300: "#c2c9d4",
          400: "#878e9c",
          500: "#5b6472",
          600: "#3e4553",
          700: "#282d38",
          800: "#1a1e26",
          900: "#131720",
          950: "#0b0e14",
        },
        // Primary brand — Flipkart blue.
        accent: {
          50: "#eef4fe",
          100: "#d3e2fc",
          200: "#a9c6f9",
          400: "#4d8bf4",
          500: "#2874f0",
          600: "#1e5fd0",
          700: "#1a4fa8",
        },
        // CTA / deal accent — amber → deep orange (ADD TO CART / BUY NOW).
        copper: {
          50: "#fff4e5",
          100: "#ffe0b3",
          400: "#ff9f00",
          500: "#fb641b",
          600: "#e2560f",
        },
        success: { DEFAULT: "#388e3c", soft: "#e8f5e9", edge: "#a5d6a7" },
        danger: { DEFAULT: "#d13438", dark: "#a72226", soft: "#fbe9e9", edge: "#f0bcbd" },
        warning: { DEFAULT: "#b5690a", soft: "#fdf1e2", edge: "#f0d3a4" },
        paper: "#f1f3f6",
        // Dark footer / dark promo surfaces.
        footer: "#172337",
      },
      fontFamily: {
        sans: ["Roboto", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Roboto", "-apple-system", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(40, 44, 63, 0.06), 0 2px 8px rgba(40, 44, 63, 0.05)",
        pop: "0 4px 16px rgba(40, 44, 63, 0.12)",
        deep: "0 16px 48px rgba(40, 44, 63, 0.16)",
      },
      backgroundImage: {
        // Bright blue hero band (Flipkart-style promotional strip).
        "hero-night":
          "radial-gradient(circle at 85% 15%, rgba(255,159,0,.25), transparent 22rem), linear-gradient(120deg, #2874f0 0%, #1e5fd0 55%, #1a4fa8 100%)",
        "promo-band":
          "linear-gradient(105deg, #1a4fa8 0%, #2874f0 55%, #1e5fd0 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // The cart drawer sliding in from the right edge.
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms ease both",
        "rise-in": "rise-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 140ms ease-out both",
        "slide-in-right": "slide-in-right 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.8s linear infinite",
        "spin-slow": "spin-slow 1s linear infinite",
      },
    },
  },
  plugins: [],
};
