/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Albastru inchis — primary, sidebar activ, butoane principale
        primary: {
          50:  "#e8f0fe",
          100: "#c5d8fc",
          200: "#9bbdf9",
          300: "#6b9ef5",
          400: "#4a84f0",
          500: "#1a5fd4",   // albastru principal
          600: "#1450b8",
          700: "#0e3d96",
          800: "#092d74",
          900: "#061f52",
        },
        // Albastru deschis — accente, badge-uri info
        accent: {
          50:  "#e6f4ff",
          100: "#bae3ff",
          200: "#7dc8ff",
          300: "#38a8f5",
          400: "#0e8de0",
          500: "#0072c6",   // albastru deschis principal
          600: "#005aa3",
          700: "#004480",
          800: "#002f5e",
          900: "#001d3d",
        },
        // Verde inchis — activ, succes confirmat
        success: {
          50:  "#e8f5e9",
          100: "#c8e6c9",
          200: "#a5d6a7",
          300: "#66bb6a",
          400: "#2e9e3f",   // verde inchis principal
          500: "#1b7a2e",
          600: "#145f24",
          700: "#0e461a",
          800: "#093011",
          900: "#051d0a",
        },
        // Verde deschis — badge activ, confirmat light
        mint: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#4ade80",
          400: "#16a34a",   // verde deschis principal
          500: "#15803d",
          600: "#166534",
          700: "#14532d",
          800: "#052e16",
          900: "#031a0d",
        },
        // Rosu — notificari, alerte, erori, stergere
        danger: {
          50:  "#fff0f0",
          100: "#ffd6d6",
          200: "#ffaaaa",
          300: "#ff7070",
          400: "#f03a3a",   // rosu principal notificari
          500: "#d41a1a",
          600: "#b01212",
          700: "#8c0c0c",
          800: "#680808",
          900: "#440404",
        },
        // Portocaliu — avertismente, suspendat
        warning: {
          50:  "#fff8e6",
          100: "#ffecc0",
          200: "#ffda8a",
          300: "#ffc142",
          400: "#f59e0b",
          500: "#d97706",
          600: "#b45309",
          700: "#92400e",
          800: "#6b2f09",
          900: "#451d04",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
        modal: "0 20px 60px -10px rgb(0 0 0 / 0.25)",
      },
    },
  },
  plugins: [],
}
