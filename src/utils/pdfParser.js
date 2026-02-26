/**
 * PDF-парсер КМД (Комплект металлоконструктивной документации)
 * Работает полностью в браузере через pdfjs-dist, без внешних API.
 *
 * Логика:
 *  1. Скачиваем PDF по URL
 *  2. Извлекаем текстовые элементы с координатами (pdfjs)
 *  3. Группируем по строкам (±5px по Y)
 *  4. Ищем строки содержащие марку (К1, Б2, ФМ1, НС1 и т.д.)
 *  5. Из чисел в строке восстанавливаем qty × weight_unit ≈ weight_total
 */

import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Локальный воркер через Vite ?url (не требует CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// ── Паттерны ──────────────────────────────────────────────────

// Марка: русская заглавная буква + опц. ещё буквы + цифры + опц. .цифры
// Примеры: К1, К1.1, К-1, Б2, ФМ1, НС1, ВС1, Р1, СФ1, НТС1
const MARK_RE = /^[А-ЯЁ]{1,3}[-–]?\d{1,3}(\.\d{1,2})?$/;

// Ключевые слова профилей → тип реза
const PROFILE_KEYWORDS = ['ТРУБА', 'УГОЛОК', 'ДВУТАВР', 'ШВЕЛЛЕР', 'КРУГ',
  'ПОЛОСА', 'КВАДРАТ', 'ДВТ', 'БАЛКА', 'ПРОКАТ'];
const SHEET_KEYWORDS   = ['ЛИСТ', 'РАСКРОЙ', 'ФАСОНКА', 'ПЛАСТИНА'];

// ── Вспомогательные ──────────────────────────────────────────

function detectCutTypes(tokens) {
  const text = tokens.join(' ').toUpperCase();
  const hasSheet   = SHEET_KEYWORDS.some(k => text.includes(k));
  const hasProfile = PROFILE_KEYWORDS.some(k => text.includes(k));
  return {
    hasProfileCut: hasProfile || !hasSheet, // дефолт — профиль
    hasSheetCut:   hasSheet,
  };
}

function detectComplexity(markId) {
  const id = markId.toUpperCase();
  if (/^ФМ|^ФС|^ФР|^ФК/.test(id)) return 'complex'; // фермы
  if (/^К|^Б|^Р|^НС|^ВС|^НТС|^ВТС/.test(id)) return 'medium'; // колонны, балки
  return 'simple';
}

function detectSizeCategory(weight_kg, lengthMm = 0) {
  if (lengthMm > 6000) return 'xlarge';
  if (lengthMm > 3000) return 'large';
  if (lengthMm > 1500) return 'medium';
  if (lengthMm > 0)    return 'small';
  // По весу если длина неизвестна
  if (weight_kg > 400) return 'xlarge';
  if (weight_kg > 120) return 'large';
  if (weight_kg > 30)  return 'medium';
  return 'small';
}

/** Извлечь положительные числа из массива токенов */
function extractNumbers(tokens) {
  return tokens
    .map(t => parseFloat(t.replace(',', '.')))
    .filter(n => !isNaN(n) && isFinite(n) && n > 0);
}

/**
 * Из набора чисел в строке восстановить (quantity, weight_per_unit).
 * Опираемся на то, что qty * weight_unit ≈ weight_total.
 */
function resolveQtyAndWeight(numbers) {
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return { quantity: 1, weight_kg: numbers[0] };

  // Перебираем тройки (a, b, c): если a * b ≈ c → a=qty, b=weight_unit
  for (let i = 0; i < numbers.length - 2; i++) {
    for (let j = i + 1; j < numbers.length - 1; j++) {
      for (let k = j + 1; k < numbers.length; k++) {
        const [a, b, c] = [numbers[i], numbers[j], numbers[k]];
        const tol = Math.max(c * 0.03, 0.5);
        if (Number.isInteger(a) && a >= 1 && a <= 200 && b > 0.1 && Math.abs(a * b - c) < tol) {
          return { quantity: a, weight_kg: b };
        }
        if (Number.isInteger(b) && b >= 1 && b <= 200 && a > 0.1 && Math.abs(b * a - c) < tol) {
          return { quantity: b, weight_kg: a };
        }
      }
    }
  }

  // Пары: qty * weight ≈ последнее число
  const last = numbers[numbers.length - 1];
  for (let i = 0; i < numbers.length - 1; i++) {
    for (let j = i + 1; j < numbers.length - 1; j++) {
      const [a, b] = [numbers[i], numbers[j]];
      const tol = Math.max(last * 0.03, 0.5);
      if (Number.isInteger(a) && a >= 1 && a <= 200 && Math.abs(a * b - last) < tol) {
        return { quantity: a, weight_kg: b };
      }
      if (Number.isInteger(b) && b >= 1 && b <= 200 && Math.abs(b * a - last) < tol) {
        return { quantity: b, weight_kg: a };
      }
    }
  }

  // Fallback: ищем первое целое ≤ 100 → это qty, следующее число → weight
  const intIdx = numbers.findIndex(n => Number.isInteger(n) && n >= 1 && n <= 100);
  if (intIdx >= 0 && intIdx + 1 < numbers.length) {
    return { quantity: numbers[intIdx], weight_kg: numbers[intIdx + 1] };
  }

  // Последний резерв: qty=1, weight=последнее число
  return { quantity: 1, weight_kg: numbers[numbers.length - 1] };
}

// ── Основные функции ──────────────────────────────────────────

/**
 * Извлечь текст из PDF (строки = массивы токенов)
 * @param {string} url - публичный URL PDF
 * @returns {Promise<string[][]>}
 */
export async function extractTextFromPdf(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Не удалось скачать PDF (${response.status})`);
  const arrayBuffer = await response.arrayBuffer();

  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allRows = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page     = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    // Текстовые элементы с позицией
    const items = textContent.items
      .filter(item => item.str && item.str.trim().length > 0)
      .map(item => ({
        str: item.str.trim(),
        x:   Math.round(item.transform[4]),
        y:   Math.round(viewport.height - item.transform[5]), // PDF Y — снизу, инвертируем
      }));

    // Сортируем: сначала по Y (строки), потом по X (колонки слева направо)
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 5) return a.y - b.y;
      return a.x - b.x;
    });

    // Группируем в строки по Y-близости ≤ 5px
    let currentRow = [];
    let currentY   = null;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= 5) {
        currentRow.push(item.str);
        if (currentY === null) currentY = item.y;
      } else {
        if (currentRow.length > 0) allRows.push(currentRow);
        currentRow = [item.str];
        currentY   = item.y;
      }
    }
    if (currentRow.length > 0) allRows.push(currentRow);
  }

  return allRows;
}

/**
 * Распарсить строки текста КМД → марки
 * @param {string[][]} textRows
 * @returns {{ marks: Object[], total_tonnage: number, note: string }}
 */
export function parseKMDText(textRows) {
  const marks   = [];
  const seenIds = new Set();

  // Стоп-слова: заголовки таблиц которые могут совпасть с паттерном марки
  const STOP_WORDS = new Set(['МАРКА', 'МАРКИ', 'МАР.', 'НА', 'ПО', 'ЗА']);

  for (const row of textRows) {
    // Ищем позицию марки в строке
    const markIdx = row.findIndex(token => MARK_RE.test(token));
    if (markIdx < 0) continue;

    const markId = row[markIdx];
    if (STOP_WORDS.has(markId.toUpperCase())) continue;
    if (seenIds.has(markId)) continue;

    // Токены после марки
    const afterMark = row.slice(markIdx + 1);
    const numbers   = extractNumbers(afterMark);
    if (numbers.length === 0) continue;

    const resolved = resolveQtyAndWeight(numbers);
    if (!resolved || resolved.weight_kg <= 0) continue;

    // Попытаться определить длину (мм) — первое число > 500 и целое
    const lengthMm = numbers.find(n => Number.isInteger(n) && n > 500 && n <= 20000) || 0;

    const { hasProfileCut, hasSheetCut } = detectCutTypes(afterMark);
    const sizeCategory = detectSizeCategory(resolved.weight_kg, lengthMm);
    const complexity   = detectComplexity(markId);

    seenIds.add(markId);
    marks.push({
      id:           markId,
      weight_kg:    Math.round(resolved.weight_kg * 10) / 10,
      quantity:     Math.round(resolved.quantity),
      category:     'other',
      sizeCategory,
      hasProfileCut,
      hasSheetCut,
      complexity,
    });
  }

  const totalTonnage = Math.round(
    marks.reduce((s, m) => s + m.weight_kg * m.quantity, 0) * 10
  ) / 10000; // кг → тонны, округление

  const note = marks.length > 0
    ? `Распознано ${marks.length} марок, ~${totalTonnage} т`
    : 'Марки не найдены. Проверьте формат — PDF должен быть текстовым (не скан).';

  return { marks, total_tonnage: totalTonnage, note };
}
