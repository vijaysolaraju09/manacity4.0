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
          50: '#e6fff8',
          100: '#c0fff0',
          200: '#8cf8e4',
          300: '#57efd7',
          400: '#2ee2cc',
          500: '#12c9b2',
          600: '#0ea495',
          700: '#0b8177',
          800: '#09665f',
          900: '#06453f'
        },
        accent: {
          50: '#f4ebff',
          100: '#eadcff',
          200: '#d8bfff',
          300: '#be91ff',
          400: '#a566ff',
          500: '#8b3dff',
          600: '#6b2ed6',
          700: '#5325a8',
          800: '#3d1c7a',
          900: '#28124d'
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
        },
        bg: { DEFAULT: 'rgb(var(--bg) / <alpha-value>)' },
        surface: {
          0: 'rgb(var(--surface-0)/<alpha-value>)',
          1: 'rgb(var(--surface-1)/<alpha-value>)',
          2: 'rgb(var(--surface-2)/<alpha-value>)'
        },
        text: {
          primary: 'rgb(var(--text-primary)/<alpha-value>)',
          secondary: 'rgb(var(--text-secondary)/<alpha-value>)',
          muted: 'rgb(var(--text-muted)/<alpha-value>)'
        },
        borderc: { DEFAULT: 'rgb(var(--border)/<alpha-value>)' }
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md, 14px)',
        lg: 'var(--radius-lg, 18px)',
        xl: '1.25rem',
        '2xl': '1.5rem',
        pill: 'var(--radius-pill, 999px)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glass: 'var(--shadow-glass)',
        mobile: 'var(--shadow-md)',
        brand: 'var(--shadow-brand, 0 12px 28px rgba(52,163,167,.33))',
        elev1: 'var(--elev-1, 0 1px 2px rgba(0,0,0,.55))',
        elev2: 'var(--elev-2, 0 10px 24px rgba(2,6,12,.65), 0 2px 6px rgba(2,6,12,.6))',
        elevBrand: 'var(--elev-brand, 0 12px 28px rgba(52,163,167,.33))',
        'elev-1': '0 6px 20px rgba(18,201,178,0.10), 0 2px 6px rgba(139,61,255,0.10)',
        'elev-2': '0 12px 28px rgba(18,201,178,0.12), 0 6px 16px rgba(139,61,255,0.12)',
        'inner-card': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)'
      },
      backdropBlur: { xs: '2px' }
    }
  },
  plugins: []
}
