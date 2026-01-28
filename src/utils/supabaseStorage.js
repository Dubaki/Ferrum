/**
 * Утилита для работы с Supabase Storage (загрузка PDF чертежей)
 *
 * Supabase Storage - бесплатный облачный сервис для хранения файлов
 * Лимиты: 1 GB хранения БЕСПЛАТНО
 * Регистрация: https://supabase.com/ (только email, без карты!)
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Получить Supabase клиент
 */
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase не настроен! Добавьте переменные в .env:\n' +
      'VITE_SUPABASE_URL=ваш_project_url\n' +
      'VITE_SUPABASE_ANON_KEY=ваш_anon_key\n\n' +
      'См. инструкцию в SUPABASE_SETUP.md'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Загрузить PDF чертёж в Supabase Storage
 * @param {File} file - PDF файл
 * @param {string} orderId - ID заказа (для организации файлов в папки)
 * @returns {Promise<{name: string, url: string, path: string, size: number, uploadedAt: string}>}
 */
export const uploadDrawing = async (file, orderId) => {
  try {
    // Проверка типа файла
    if (file.type !== 'application/pdf') {
      throw new Error('Можно загружать только PDF файлы');
    }

    // Проверка размера (макс 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Файл слишком большой. Максимальный размер: 10MB');
    }

    const supabase = getSupabaseClient();

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.pdf`;
    const filePath = `drawings/${orderId}/${fileName}`;

    // Загружаем файл
    const { data, error } = await supabase.storage
      .from('planfer-drawings')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(error.message || 'Ошибка загрузки в Supabase');
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('planfer-drawings')
      .getPublicUrl(filePath);

    return {
      name: file.name,
      url: urlData.publicUrl,
      path: filePath, // Для удаления
      size: file.size,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка загрузки в Supabase:', error);
    throw error;
  }
};

/**
 * Удалить чертёж из Supabase Storage
 * @param {string} filePath - Путь к файлу в storage
 */
export const deleteDrawing = async (filePath) => {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from('planfer-drawings')
      .remove([filePath]);

    if (error) {
      throw new Error(error.message || 'Ошибка удаления из Supabase');
    }
  } catch (error) {
    console.error('Ошибка удаления из Supabase:', error);
    throw error;
  }
};

/**
 * Загрузить счёт в Supabase Storage (раздел Снабжение)
 * @param {File} file - PDF или изображение счёта
 * @param {string} requestNumber - Номер заявки (СН-26001)
 * @returns {Promise<{name: string, url: string, path: string, size: number, uploadedAt: string}>}
 */
export const uploadInvoice = async (file, requestNumber) => {
  try {
    // Проверка типа файла
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Допустимые форматы: PDF, JPG, PNG, GIF');
    }

    // Проверка размера (макс 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Файл слишком большой. Максимальный размер: 10MB');
    }

    const supabase = getSupabaseClient();

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeRequestNumber = requestNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileName = `${safeRequestNumber}_${timestamp}.${ext}`;
    const filePath = `invoices/${fileName}`;

    // Загружаем файл
    const { data, error } = await supabase.storage
      .from('planfer-drawings') // Используем тот же bucket
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(error.message || 'Ошибка загрузки файла');
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('planfer-drawings')
      .getPublicUrl(filePath);

    return {
      name: file.name,
      url: urlData.publicUrl,
      path: filePath,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка загрузки счёта в Supabase:', error);
    throw error;
  }
};

/**
 * Удалить счёт из Supabase Storage
 * @param {string} filePath - Путь к файлу в storage
 */
export const deleteInvoice = async (filePath) => {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from('planfer-drawings')
      .remove([filePath]);

    if (error) {
      throw new Error(error.message || 'Ошибка удаления файла');
    }
  } catch (error) {
    console.error('Ошибка удаления счёта из Supabase:', error);
    throw error;
  }
};

/**
 * Проверить настроен ли Supabase
 * @returns {boolean}
 */
export const isSupabaseConfigured = () => {
  try {
    getSupabaseClient();
    return true;
  } catch {
    return false;
  }
};

/**
 * Получить информацию о конфигурации (для отладки)
 */
export const getSupabaseInfo = () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return {
      configured: !!supabaseUrl && !!supabaseKey,
      url: supabaseUrl,
      hasKey: !!supabaseKey
    };
  } catch (error) {
    return {
      configured: false,
      error: error.message
    };
  }
};
