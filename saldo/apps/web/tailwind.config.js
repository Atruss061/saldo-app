/** @type {import('tailwindcss').Config} */
// Tokens extraídos do DESIGN.md gerado pelo Stitch (tema "Saldo Narrative").
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#111319",
        surface: "#111319",
        "surface-dim": "#111319",
        "surface-bright": "#36393f",
        "surface-container-lowest": "#0b0e13",
        "surface-container-low": "#191c21",
        "surface-container": "#1d2025",
        "surface-container-high": "#272a30",
        "surface-container-highest": "#32353a",
        "on-surface": "#e1e2e9",
        "on-surface-variant": "#bbcabf",
        outline: "#86948a",
        "outline-variant": "#3c4a41",
        primary: "#55e9a9",
        "primary-container": "#2ecc8f",
        "on-primary": "#003824",
        "on-primary-container": "#005135",
        secondary: "#bbc3ff",
        "secondary-container": "#2c3da6",
        tertiary: "#ffc0bf",
        "tertiary-container": "#ff9797",
        error: "#ffb4ab",
        "error-container": "#93000a",
        // atalhos semânticos usados no app
        income: "#55e9a9",
        expense: "#e5686b",
        invest: "#7c8cf8",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      maxWidth: {
        container: "1200px",
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
    },
  },
  plugins: [],
};
