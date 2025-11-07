/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b1f24',      // Темный бирюзовый фон
        surface: '#12343b',         // Поверхность карточек (темно-бирюзовый)
        primary: '#40E0D0',         // Яркий бирюзовый акцент
        accent: '#40E0D0',          // Бирюзовый акцент
        'border-color': '#3DDAD7',  // Светлый бирюзовый для рамок/линий
        'text-primary': '#FFFFFE',
        'text-secondary': '#94A3B8',
      },
    },
    fontFamily: {
      sans: ['"Press Start 2P"', 'cursive', ...defaultTheme.fontFamily.sans],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}