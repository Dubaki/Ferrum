/**
 * AI-Парсер чертежей (Скриптовая версия)
 * Распознает чертежи по именам файлов и паттернам
 */

// База знаний по текущим чертежам из папки context
const DRAWING_KNOWLEDGE_BASE = {
  // КМД Ангара Ф4
  'Ф4': {
    order_type: 'A',
    total_tonnage: 1.86,
    marks: [
      { id: "К1", weight_kg: 453.2, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "К1.1", weight_kg: 453.2, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "К2", weight_kg: 478.6, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "К2.1", weight_kg: 478.6, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' }
    ]
  },
  // КМД Ангара Ф3 (10х21х4)
  'Ф3': {
    order_type: 'A',
    total_tonnage: 4.84,
    marks: [
      { id: "К1", weight_kg: 100.9, quantity: 8, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "К2", weight_kg: 105.2, quantity: 4, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "ФМ1", weight_kg: 213.2, quantity: 4, category: "truss", sizeCategory: "xlarge", hasProfileCut: true, hasSheetCut: true, complexity: 'complex' },
      { id: "ФМ2", weight_kg: 216.7, quantity: 2, category: "truss", sizeCategory: "xlarge", hasProfileCut: true, hasSheetCut: true, complexity: 'complex' },
      { id: "Р1", weight_kg: 70.6, quantity: 14, category: "beam", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true, complexity: 'simple' },
      { id: "СФ1", weight_kg: 66.1, quantity: 2, category: "column", sizeCategory: "medium", hasProfileCut: true, hasSheetCut: true, complexity: 'medium' },
      { id: "ВС1", weight_kg: 76.4, quantity: 2, category: "brace", sizeCategory: "medium", hasProfileCut: true, hasSheetCut: false, complexity: 'simple' }
    ]
  },
  // Стремянка
  'стремянка': {
    order_type: 'B',
    marks: [
      { id: "С-1 (H=2500)", weight_kg: 45, quantity: 4, category: "stair", sizeCategory: "medium", hasProfileCut: true, hasSheetCut: false, complexity: 'simple' }
    ]
  },
  // Сальники (пример Ду 500)
  'Ду 500': {
    order_type: 'B',
    marks: [
      { id: "Сальник Ду500 L=300", weight_kg: 90.2, quantity: 2, category: "seal", sizeCategory: "small", hasProfileCut: false, hasSheetCut: true, needsRolling: true, complexity: 'medium' }
    ]
  }
};

/**
 * "Распознать" чертеж с помощью скриптовой базы знаний
 */
export const parseDrawingWithAI = async (fileUrl, fileName = '') => {
  // Имитируем задержку "раздумий" системы
  await new Promise(resolve => setTimeout(resolve, 1500));

  const name = (fileName || fileUrl).toUpperCase();

  // 1. Поиск точного совпадения в базе знаний
  for (const key in DRAWING_KNOWLEDGE_BASE) {
    if (name.includes(key.toUpperCase())) {
      return DRAWING_KNOWLEDGE_BASE[key];
    }
  }

  // 2. Если не нашли — возвращаем универсальный шаблон на основе имени
  return {
    order_type: 'A',
    marks: [
      { 
        id: "МАРКА-01", 
        weight_kg: 100, 
        quantity: 1, 
        category: "other", 
        sizeCategory: "medium", 
        hasProfileCut: true, 
        hasSheetCut: false,
        complexity: 'medium'
      }
    ],
    note: "AI не нашел этот чертеж в базе знаний, использован шаблон."
  };
};

/**
 * Симуляция для отладки интерфейса (если нет ключа)
 */
const simulateParsing = async (fileUrl) => {
  await new Promise(resolve => setTimeout(resolve, 3000)); // Имитация задержки
  
  // Если в URL есть "Ф4", возвращаем данные из вашего примера
  if (fileUrl.includes('Ф4')) {
    return {
      order_type: 'A',
      total_tonnage: 1.86,
      marks: [
        { id: "К1", weight_kg: 453.2, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true },
        { id: "К1.1", weight_kg: 453.2, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true },
        { id: "К2", weight_kg: 478.6, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true },
        { id: "К2.1", weight_kg: 478.6, quantity: 2, category: "column", sizeCategory: "large", hasProfileCut: true, hasSheetCut: true }
      ]
    };
  }

  // Дефолтный ответ
  return {
    order_type: 'A',
    marks: [
      { id: "Б-01", weight_kg: 120, quantity: 10, category: "beam", sizeCategory: "medium", hasProfileCut: true, hasSheetCut: false }
    ]
  };
};
