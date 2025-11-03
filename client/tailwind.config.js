export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,scss}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--surface)',
        foreground: 'var(--ink-900)',
        border: 'var(--border-subtle)',
        surface0: 'var(--surface-0)',
        surface1: 'var(--surface-1)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        surface: {
          DEFAULT: 'var(--surface)',
          card: 'var(--surface-card)',
          glass: 'var(--surface-glass)'
        },
        brand: {
          900: 'var(--brand-800)',
          800: 'var(--brand-700)',
          700: 'var(--brand-600)',
          600: 'var(--brand-500)',
          500: 'var(--brand-500)',
          400: 'var(--brand-400)',
          300: 'var(--brand-300)',
          200: 'var(--brand-200)',
          100: 'var(--brand-100)',
          50: 'var(--brand-050)'
        },
        accent: {
          700: 'var(--accent-700)',
          600: 'var(--accent-600)',
          500: 'var(--accent-500)',
          400: 'var(--accent-400)',
          300: 'var(--accent-300)'
        },
        success: {
          600: 'var(--success-600)',
          500: 'var(--success-500)'
        },
        warning: {
          600: 'var(--warning-600)',
          500: 'var(--warning-500)'
        },
        danger: {
          600: 'var(--danger-600)',
          500: 'var(--danger-500)'
        },
        ink: {
          900: 'var(--ink-900)',
          800: 'var(--ink-800)',
          700: 'var(--ink-700)',
          600: 'var(--ink-600)',
          500: 'var(--ink-500)',
          400: 'var(--ink-400)',
          300: 'var(--ink-300)',
          200: 'var(--ink-200)',
          100: 'var(--ink-100)',
          hi: 'var(--ink-hi)',
          md: 'var(--ink-md)',
          lo: 'var(--ink-lo)'
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
        brand: 'var(--shadow-brand)',
        elev1: 'var(--elev-1)',
        elev2: 'var(--elev-2)',
        elevBrand: 'var(--elev-brand)'
      }
    }
  },
  plugins: []
}
