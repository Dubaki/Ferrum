// src/utils/helpers.js

export const formatDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();

  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 - Вс, 6 - Сб
};

export const getMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getOpColor = (id) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
  ];
  return colors[id % colors.length];
};

// --- ГЛАВНАЯ ФУНКЦИЯ РАСЧЕТА ЧАСОВ ---
export const getResourceHoursForDate = (resource, dateObj) => {
    const dateStr = formatDate(dateObj);
    const schedule = resource.schedule?.[dateStr]; 
    
    // 1. Сначала смотрим личные исключения (отпуск/больничный/доп.смена)
    if (schedule) {
      if (schedule.type === 'sick' || schedule.type === 'vacation') return 0;
      if (schedule.type === 'work') return schedule.hours || resource.hoursPerDay;
    }
    
    // 2. Если исключений нет, смотрим стандартные выходные
    const day = dateObj.getDay();
    if (day === 0 || day === 6) {
        // Здесь можно добавить проверку: работает ли этот конкретный человек по выходным
        // Пока считаем, что по умолчанию выходные у всех
        return 0; 
    }
    
    // 3. Обычный рабочий день
    return resource.hoursPerDay || 8;
};