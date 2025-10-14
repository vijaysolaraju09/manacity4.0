export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(255 255 255 / 1)',
        'background-dark': 'rgb(15 23 42 / 1)',
      },
    },
  },
  plugins: [],
};
