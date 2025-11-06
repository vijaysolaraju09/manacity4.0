module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--mc-bg) / <alpha-value>)",
        surface: "rgb(var(--mc-surface) / <alpha-value>)",
        on: {
          surface: "rgb(var(--mc-on-surface) / <alpha-value>)",
          muted: "rgb(var(--mc-muted) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--mc-primary) / <alpha-value>)",
          600: "rgb(var(--mc-primary-600) / <alpha-value>)",
        },
        accent: "rgb(var(--mc-accent) / <alpha-value>)",
        success: "rgb(var(--mc-success) / <alpha-value>)",
        warning: "rgb(var(--mc-warning) / <alpha-value>)",
        danger: "rgb(var(--mc-danger) / <alpha-value>)",
        border: "rgb(var(--mc-border) / <alpha-value>)",
      },
      borderRadius: {
        md: "var(--mc-radius)",
        lg: "calc(var(--mc-radius) * 1.5)",
        xl: "calc(var(--mc-radius) * 2)",
      },
      boxShadow: {
        sm: "var(--mc-shadow-sm)",
        md: "var(--mc-shadow-md)",
        lg: "var(--mc-shadow-lg)",
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui"],
      },
    },
  },
  plugins: [],
};
