// ─────────────────────────────────────────────────────────────
// НОРМЫ ТРУДОЁМКОСТИ
// Единицы: часы на тонну (ч/т) — калибруются по архиву plan vs fact
// Все значения подтверждены: сессия 23.02.2026
// ─────────────────────────────────────────────────────────────

// Базовые нормы (ч/т)
export const NORMS = {
  // Резка профиля (пила): базовая. ×1.4 если деталь > 50 кг
  cut_profile: 2.0,

  // Резка листа (плазма): ч/т по толщине
  // Толщина влияет на скорость — 3 уровня
  cut_sheet: {
    thin:   1.2,  // ≤ 5 мм
    medium: 1.8,  // 6–12 мм
    thick:  2.8,  // 13–20 мм (макс. 20 мм)
  },

  // Сборка + Сварка (один человек на посту) (ч/т)
  weld_assembly: {
    simple:  8,
    medium:  13,
    complex: 20,
  },

  // Слесарка: зачистка (ч/т)
  fitting_clean: {
    simple:  1.0,
    medium:  1.5,
    complex: 2.0,
  },

  // Слесарка: упаковка (ч/т)
  fitting_pack: {
    simple:  0.5,
    medium:  1.0,
    complex: 2.0,
  },

  // Покраска (ч/т)
  paint: {
    simple:  1.5,
    medium:  2.5,
    complex: 3.5,
  },

  // Сушка: ВСЕГДА 2 часа, блокирует камеру
  drying: 2,

  // Вальцовка (гибка листа в цилиндр): ч/т
  // Применяется для корпусов Ду300+ (сальники, обечайки)
  // Норма предварительная — уточнить по факту после первых заказов
  rolling: 4.0,

  // Кран: коэффициент к норме пилы при весе детали > 50 кг
  craneCoeff: 1.4,
};

// Параметры по категории габаритов
// Категория определяется по максимальной длине детали внутри марки
export const SIZE_PARAMS = {
  small: {
    // L ≤ 1500 мм
    label:     'Малый',
    maxLengthMm: 1500,
    largePost: false,   // стандартный пост
    moveCoeff: 0.05,    // 5% от времени зачистки на перемещение
  },
  medium: {
    // 1500 < L ≤ 3000 мм
    label:     'Средний',
    maxLengthMm: 3000,
    largePost: false,
    moveCoeff: 0.15,    // 15%
  },
  large: {
    // 3000 < L ≤ 6000 мм
    label:     'Крупный',
    maxLengthMm: 6000,
    largePost: true,    // только крупногаб. посты №1-2
    moveCoeff: 0.30,    // 30%
  },
  xlarge: {
    // L > 6000 мм (фермы, длинные колонны)
    label:     'Негабарит',
    maxLengthMm: Infinity,
    largePost: true,
    moveCoeff: 0.50,    // 50%
  },
};

// ─── Вспомогательные функции ───────────────────────────────

/**
 * Определить категорию габарита по максимальной длине детали
 * @param {number} maxLengthMm - максимальная длина детали в мм
 * @returns {'small'|'medium'|'large'|'xlarge'}
 */
export function getSizeCategory(maxLengthMm) {
  if (!maxLengthMm || maxLengthMm <= 0) return 'medium'; // дефолт
  if (maxLengthMm <= 1500) return 'small';
  if (maxLengthMm <= 3000) return 'medium';
  if (maxLengthMm <= 6000) return 'large';
  return 'xlarge';
}

/**
 * Нужен ли кран для операции
 * @param {number} maxElementWeightKg - масса самой тяжёлой детали в марке
 * @returns {boolean}
 */
export function needsCrane(maxElementWeightKg) {
  return (maxElementWeightKg || 0) > 50;
}

/**
 * Определить норму резки листа по толщине
 * @param {number} thicknessMm
 * @returns {number} ч/т
 */
export function getSheetCutNorm(thicknessMm) {
  if (!thicknessMm || thicknessMm <= 5) return NORMS.cut_sheet.thin;
  if (thicknessMm <= 12)               return NORMS.cut_sheet.medium;
  return NORMS.cut_sheet.thick;
}

/**
 * Округлить до 1 знака, минимум 0.1 ч
 */
export function roundHours(h) {
  return Math.max(0.1, Math.round(h * 10) / 10);
}

/**
 * Определить тип профиля → вид реза (пила / плазма)
 * Поддерживает оба формата КМД: Текла и компактный (КВ./УГ./Р./ и т.д.)
 * @param {string} profileStr - строка профиля из КМД
 * @returns {'profile'|'sheet'|'unknown'}
 */
export function getProfileCutType(profileStr) {
  if (!profileStr) return 'unknown';
  const p = profileStr.trim().toUpperCase();

  // Компактная нотация (своя КМД: КВ./УГ./Р./Ф./П./ШВ.)
  if (p.startsWith('Р.')  || p.startsWith('Ф.')  || p.startsWith('П.'))  return 'sheet';
  if (p.startsWith('КВ.') || p.startsWith('УГ.') || p.startsWith('ШВ.') ||
      p.startsWith('КР.') || p.startsWith('ДВ.') || p.startsWith('Т.'))  return 'profile';

  // Текла нотация (полные слова)
  if (p.includes('ЛИСТ'))    return 'sheet';
  if (p.includes('РАСКРОЙ')) return 'sheet';
  if (p.includes('ФАСОНКА')) return 'sheet';
  if (p.includes('ПЛАСТИНА'))return 'sheet';

  if (p.includes('ТРУБА'))   return 'profile';
  if (p.includes('УГОЛОК'))  return 'profile';
  if (p.includes('ШВЕЛЛЕР')) return 'profile';
  if (p.includes('ДВУТАВР')) return 'profile';
  if (p.includes('КРУГ'))    return 'profile';
  if (p.includes('ПОЛОСА'))  return 'profile';
  if (p.includes('КВ.'))     return 'profile';

  return 'unknown';
}
