export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,scss}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background, 0 0% 100%))'
      }
    }
  },
  plugins: []
}
