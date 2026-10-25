/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: { extend: { colors: { brand: 'rgb(var(--brand) / <alpha-value>)' }, fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'] } } },
  plugins: [],
}
