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