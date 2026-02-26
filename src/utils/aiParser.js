/**
 * AI-Парсер чертежей
 * Использует pdfjs-dist для извлечения текста из PDF без внешних API.
 */

import { extractTextFromPdf, parseKMDText } from './pdfParser';

/**
 * Распознать КМД из PDF-файла и вернуть список марок.
 * @param {string} fileUrl  - публичный URL PDF
 * @param {string} fileName - имя файла (для лога)
 * @returns {Promise<{ marks: Object[], total_tonnage: number, note: string }>}
 */
export const parseDrawingWithAI = async (fileUrl, fileName = '') => {
  try {
    const textRows = await extractTextFromPdf(fileUrl);
    const result   = parseKMDText(textRows);

    if (result.marks.length > 0) {
      return result;
    }

    // Марки не найдены — возвращаем с пояснением
    return {
      marks: [],
      total_tonnage: 0,
      note: result.note,
    };
  } catch (err) {
    console.error('[aiParser] Ошибка парсинга PDF:', err);
    throw new Error(`Не удалось прочитать PDF: ${err.message}`);
  }
};
