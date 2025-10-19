const withOpacityValue = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

const semanticColors = {
  foreground: withOpacityValue('--color-text-rgb'),
  border: withOpacityValue('--color-border-rgb'),
  muted: withOpacityValue('--color-muted-rgb'),
  'muted-foreground': withOpacityValue('--color-muted-foreground-rgb'),
  primary: withOpacityValue('--color-primary-rgb'),
  'primary-foreground': withOpacityValue('--color-primary-contrast-rgb'),
  secondary: withOpacityValue('--color-surface-rgb'),
  'secondary-foreground': withOpacityValue('--color-text-rgb'),
  destructive: withOpacityValue('--color-danger-rgb'),
  'destructive-foreground': withOpacityValue('--color-danger-contrast-rgb'),
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,html,scss,css}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background, 0 0% 100%))',
        ...semanticColors,
      },
    },
  },
  plugins: [],
};
