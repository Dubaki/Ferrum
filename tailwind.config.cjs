const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.cyan, // Основной цвет, акцентный
        neutral: colors.slate, // Нейтральные цвета для текста, фонов, границ
        success: colors.emerald, // Для успешных статусов, валидации
        warning: colors.orange,  // Для предупреждений
        danger: colors.red,      // Для ошибок и опасных действий
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}
