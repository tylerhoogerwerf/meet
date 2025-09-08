/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Satoshi', 'system-ui', 'sans-serif'],
        'satoshi': ['Satoshi', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'light': '300',
        'regular': '400',
        'medium': '500',
        'bold': '700',
        'black': '900',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
