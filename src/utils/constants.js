// src/utils/constants.js

export const EMPLOYEE_ROLES = [
  { id: 'welder', name: 'Сварщик', color: 'bg-orange-100 text-orange-800' },
  { id: 'fitter', name: 'Слесарь', color: 'bg-blue-100 text-blue-800' },
  { id: 'plasma', name: 'Плазморезчик', color: 'bg-purple-100 text-purple-800' },
  { id: 'saw', name: 'Лентопильщик', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'painter', name: 'Маляр', color: 'bg-green-100 text-green-800' },
];

// Начальный список операций, если база пустая
export const INITIAL_OPERATIONS = [
  "Резка Лентопил",
  "Резка Плазма",
  "Сборка",
  "Обварка",
  "Зачистка",
  "Упаковка",
  "Покраска",
  "Другие работы",
  "Погрузка/Разгрузка",
  "Обшивка панелями",
  "Заклепка Панелей",
  "Установка Горелок",
  "Установка Направляющих",
  "Установка газ коллектора",
  "Установка Тэнового узла"
];

// Логика: какая роль нужна для какой операции
// Возвращает массив ID ролей, которые могут это делать
export const getRolesForOperation = (opName) => {
    if (!opName) return [];
    const name = opName.toLowerCase();

    // 1. Лентопил
    if (name.includes('лентопил')) return ['saw'];
    
    // 2. Плазма
    if (name.includes('плазма')) return ['plasma'];

    // 3. Сварка и Сборка (Только Сварщики)
    if (name.includes('сборка') || name.includes('обварка') || name.includes('сварка')) {
        return ['welder'];
    }

    // 4. Покраска
    if (name.includes('покраска') || name.includes('маляр')) return ['painter'];

    // 5. Всё остальное (Зачистка, Упаковка, Установка и т.д.) - это Слесаря
    return ['fitter'];
};

// Проверка: подходит ли сотрудник для операции
export const isResourceEligible = (resource, opName) => {
    // Если у сотрудника нет ролей или операция не названа - показываем всех (на всякий случай)
    if (!resource.roles || resource.roles.length === 0) return true;
    if (!opName) return true;

    const requiredRoles = getRolesForOperation(opName);
    
    // Если операция не требует специфических ролей (или мы не знаем такую операцию),
    // то считаем, что она подходит (или можно сделать false, если нужна строгость)
    if (requiredRoles.length === 0) return true;

    // Если операция "слесарная" (fitter), проверим, есть ли у сотрудника роль fitter
    return resource.roles.some(role => requiredRoles.includes(role));
};