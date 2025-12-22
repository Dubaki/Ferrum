/**
 * Утилита для работы с Cloudinary (загрузка PDF чертежей)
 *
 * Cloudinary - бесплатный облачный сервис для хранения файлов
 * Лимиты: 25 GB хранения + 25 GB трафика/месяц БЕСПЛАТНО
 * Регистрация: https://cloudinary.com/ (только email, без карты!)
 */

/**
 * Конфигурация Cloudinary из переменных окружения
 */
const getCloudinaryConfig = () => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary не настроен! Добавьте переменные в .env:\n' +
      'VITE_CLOUDINARY_CLOUD_NAME=ваш_cloud_name\n' +
      'VITE_CLOUDINARY_UPLOAD_PRESET=ваш_upload_preset\n\n' +
      'См. инструкцию в CLOUDINARY_SETUP.md'
    );
  }

  return { cloudName, uploadPreset };
};

/**
 * Загрузить PDF чертёж в Cloudinary
 * @param {File} file - PDF файл
 * @param {string} orderId - ID заказа (для организации файлов в папки)
 * @returns {Promise<{name: string, url: string, publicId: string, size: number, uploadedAt: string}>}
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

    const { cloudName, uploadPreset } = getCloudinaryConfig();

    // Формируем данные для загрузки
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `planfer/drawings/${orderId}`); // Организация по папкам
    formData.append('resource_type', 'raw'); // PDF загружаются как raw

    // Отправляем на Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Ошибка загрузки в Cloudinary');
    }

    const data = await response.json();
    console.log('Cloudinary response:', data); // Отладка

    // Формируем объект с данными, фильтруя undefined значения
    const drawingData = {
      name: file.name,
      url: data.secure_url,
      publicId: data.public_id,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };

    // Добавляем cloudinaryData только если есть хотя бы одно значение
    if (data.format || data.resource_type || data.bytes) {
      drawingData.cloudinaryData = {};
      if (data.format) drawingData.cloudinaryData.format = data.format;
      if (data.resource_type) drawingData.cloudinaryData.resourceType = data.resource_type;
      if (data.bytes) drawingData.cloudinaryData.bytes = data.bytes;
    }

    return drawingData;
  } catch (error) {
    console.error('Ошибка загрузки в Cloudinary:', error);
    throw error;
  }
};

/**
 * Проверить настроен ли Cloudinary
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  try {
    getCloudinaryConfig();
    return true;
  } catch {
    return false;
  }
};

/**
 * Получить информацию о конфигурации (для отладки)
 */
export const getCloudinaryInfo = () => {
  try {
    const config = getCloudinaryConfig();
    return {
      configured: true,
      cloudName: config.cloudName,
      uploadPreset: config.uploadPreset
    };
  } catch (error) {
    return {
      configured: false,
      error: error.message
    };
  }
};

/**
 * ПРИМЕЧАНИЕ ПО УДАЛЕНИЮ:
 *
 * Cloudinary требует API Secret для удаления файлов.
 * API Secret НЕЛЬЗЯ хранить в браузере (frontend) - это небезопасно!
 *
 * Варианты решения:
 * 1. Настроить автоудаление в Cloudinary Dashboard (файлы старше 90 дней автоматически удаляются)
 * 2. Периодически чистить файлы вручную через Cloudinary Dashboard
 * 3. Помечать файлы как "удалённые" в Firestore (не показывать в UI)
 *
 * Мы используем вариант 3: файлы остаются в Cloudinary, но в Firestore помечаются как deleted.
 * В инструкции CLOUDINARY_SETUP.md описано как настроить автоудаление.
 */
