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
          foreground: 'rgb(var(--color-danger-contrast-rgb) / <alpha-value>)',
          500: 'var(--color-danger-500)'
        },
        border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
        brand: {
          700: 'var(--color-brand-700)',
          600: 'var(--color-brand-600)',
          500: 'var(--color-brand-500)',
          400: 'var(--color-brand-400)',
          300: 'var(--color-brand-300)'
        },
        accent: {
          600: 'var(--color-accent-600)',
          500: 'var(--color-accent-500)'
        },
        success: {
          500: 'var(--color-success-500)'
        },
        warning: {
          500: 'var(--color-warning-500)'
        },
        ink: {
          900: 'var(--color-ink-900)',
          700: 'var(--color-ink-700)',
          500: 'var(--color-ink-500)',
          300: 'var(--color-ink-300)',
          100: 'var(--color-ink-100)'
        }
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glass: 'var(--shadow-glass)'
      }
    }
  },
  plugins: []
}
