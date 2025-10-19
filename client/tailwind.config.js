export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,scss}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--color-text-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-contrast-rgb) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'rgb(var(--color-muted-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground-rgb) / <alpha-value>)'
        },
        surface: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
        danger: {
          DEFAULT: 'rgb(var(--color-danger-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--color-danger-contrast-rgb) / <alpha-value>)'
        },
        border: 'rgb(var(--color-border-rgb) / <alpha-value>)'
      }
    }
  },
  plugins: []
}
