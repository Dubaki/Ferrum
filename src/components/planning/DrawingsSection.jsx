import { useState } from 'react';
import { FileText, Upload, Download, Trash2, AlertCircle, Loader } from 'lucide-react';
import { uploadDrawing, isCloudinaryConfigured } from '../../utils/cloudinaryStorage';

/**
 * Секция для загрузки и просмотра PDF чертежей заказа
 */
export default function DrawingsSection({ order, actions, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Только активные (не удалённые) чертежи
  const activeDrawings = (order.drawings || []).filter(d => !d.deleted);

  // Проверяем настроен ли Cloudinary
  const cloudinaryReady = isCloudinaryConfigured();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Загружаем в Cloudinary
      const drawingData = await uploadDrawing(file, order.id);

      // Добавляем метаданные в Firestore
      await actions.addDrawingToOrder(order.id, drawingData);

      // Очищаем input для возможности загрузить тот же файл снова
      e.target.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (drawing) => {
    if (!confirm(`Удалить чертёж "${drawing.name}"?`)) return;

    try {
      await actions.deleteDrawingFromOrder(order.id, drawing.publicId);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Если Cloudinary не настроен - показываем предупреждение
  if (!cloudinaryReady) {
    return (
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Cloudinary не настроен
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Для загрузки чертежей необходимо настроить Cloudinary.
              См. инструкцию в <span className="font-mono">CLOUDINARY_SETUP.md</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <span className="text-sm font-bold text-blue-900">
            Чертежи ({activeDrawings.length})
          </span>
        </div>

        {/* Кнопка загрузки (только для админов) */}
        {isAdmin && (
          <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? (
              <>
                <Loader size={14} className="animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Upload size={14} />
                Загрузить PDF
              </>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Список чертежей */}
      {activeDrawings.length === 0 ? (
        <div className="text-center py-6 text-sm text-blue-400">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p>Чертежи не загружены</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeDrawings.map((drawing) => (
            <div
              key={drawing.publicId}
              className="flex items-center gap-3 px-3 py-2 bg-white border border-blue-200 rounded-lg hover:shadow-sm transition"
            >
              {/* Иконка PDF */}
              <FileText size={20} className="text-red-500 flex-shrink-0" />

              {/* Информация о файле */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {drawing.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(drawing.size)} • {formatDate(drawing.uploadedAt)}
                </p>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Скачать */}
                <a
                  href={drawing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                  title="Открыть/Скачать"
                >
                  <Download size={16} />
                </a>

                {/* Удалить (только для админов) */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(drawing)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded transition"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Подсказка */}
      {isAdmin && activeDrawings.length === 0 && (
        <p className="text-xs text-blue-400 text-center mt-3">
          💡 Загрузите PDF чертежи для этого заказа
        </p>
      )}
    </div>
  );
}
