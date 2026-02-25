// ─── AI Планировщик: производственные участки ────────────────

export const SHOP_STAGES = {
  CUTTING_PROFILE: 'cutting_profile',
  CUTTING_SHEET:   'cutting_sheet',
  ROLLING:         'rolling',
  WELD_ASSEMBLY:   'weld_assembly',
  FITTING:         'fitting',
  PAINTING:        'painting',
};

export const SHOP_STAGE_LABELS = {
  cutting_profile: 'Резка профиля',
  cutting_sheet:   'Резка листа',
  rolling:         'Вальцовка',
  weld_assembly:   'Сборка + Сварка',
  fitting:         'Зачистка',
  painting:        'Покраска',
};

export const SHOP_STAGE_COLORS = {
  cutting_profile: '#3b82f6',
  cutting_sheet:   '#a855f7',
  rolling:         '#06b6d4',
  weld_assembly:   '#f97316',
  fitting:         '#22c55e',
  painting:        '#ef4444',
};

export const SIZE_CATEGORY_LABELS = {
  small:  'Малый (≤1500мм)',
  medium: 'Средний (≤3000мм)',
  large:  'Крупный (≤6000мм)',
  xlarge: 'Негабарит (>6000мм)',
};

export const COMPLEXITY_LABELS = {
  simple:  'Простая',
  medium:  'Средняя',
  complex: 'Сложная',
};

// ─── Стандартные операции ────────────────────────────────────

export const STANDARD_OPERATIONS = [
  'ЧПУ резка',
  'Резка на лентопиле',
  'Вальцовка',
  'Сварка', 
  'Сборка', 
  'Зачистка', 
  'Покраска', 
  'Упаковка',
  'Погрузка'
];

export const ORDER_STATUSES = [
  { id: 'metal', label: 'Ждём металл', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'components', label: 'Ждём Комплектующие', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'drawings', label: 'Чертежи в разработке', color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'work', label: 'В работе', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'done', label: 'Готово к отгрузке', color: 'bg-blue-100 text-blue-700 border-blue-200' }
];