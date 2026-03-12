const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-sky-600',
    'text-sky-700',
    'bg-teal-500',
    'text-teal-600',
    'bg-sky-500',
    'text-sky-600',
    'bg-cyan-500',
    'text-cyan-600',
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
