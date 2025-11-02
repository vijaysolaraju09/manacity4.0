export default {
  darkMode: 'class',
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
          700: 'var(--brand-700)',
          600: 'var(--brand-600)',
          500: 'var(--brand-500)',
          400: 'var(--brand-400)',
          300: 'var(--brand-300)'
        },
        accent: {
          600: 'var(--accent-600)',
          500: 'var(--accent-500)',
          400: 'var(--accent-400)'
        },
        success: {
          500: 'var(--color-success-500)'
        },
        warning: {
          500: 'var(--color-warning-500)'
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          300: 'var(--ink-300)',
          100: 'var(--ink-100)'
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
        glass: 'var(--shadow-glass)',
        mobile: 'var(--shadow-md)',
        brand: 'var(--shadow-brand)'
      }
    }
  },
  plugins: []
}
