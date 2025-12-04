// Форматирование даты в строку YYYY-MM-DD
export const formatDate = (date) => date.toISOString().split('T')[0];

// Проверка на выходной (Воскресенье или Суббота)
export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Получение всех дней месяца
export const getMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Цвета для диаграммы
export const getOpColor = (id) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
  ];
  return colors[id % colors.length];
};

// --- ВОТ ЭТА ФУНКЦИЯ, КОТОРОЙ НЕ ХВАТАЛО ---
export const getResourceHoursForDate = (resource, dateObj) => {
    const dateStr = formatDate(dateObj);
    const schedule = resource.schedule?.[dateStr]; // Безопасное обращение
    
    // 1. Проверка исключений (График)
    if (schedule) {
      if (schedule.type === 'sick' || schedule.type === 'vacation') return 0;
      if (schedule.type === 'work') return schedule.hours || resource.hoursPerDay;
    }
    
    // 2. Проверка выходных
    const day = dateObj.getDay();
    if (day === 0 || day === 6) return 0;
    
    // 3. Обычный день
    return resource.hoursPerDay;
};