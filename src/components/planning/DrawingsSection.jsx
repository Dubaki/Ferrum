import { useState } from 'react';
import { FileText, Upload, Download, Trash2, AlertCircle, Loader } from 'lucide-react';
import { uploadDrawing, deleteDrawing, isSupabaseConfigured } from '../../utils/supabaseStorage';

/**
 * Компактная секция для загрузки и просмотра PDF чертежей заказа
 */
export default function DrawingsSection({ order, actions, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Только активные (не удалённые) чертежи
  const activeDrawings = (order.drawings || []).filter(d => !d.deleted);

  // Проверяем настроен ли Supabase
  const supabaseReady = isSupabaseConfigured();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Загружаем в Supabase
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
      // Удаляем из Supabase Storage
      if (drawing.path) {
        await deleteDrawing(drawing.path);
      }

      // Помечаем как удаленный в Firestore
      await actions.deleteDrawingFromOrder(order.id, drawing.path);
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Получить правильный URL для скачивания PDF
  const getDownloadUrl = (drawing) => {
    // Supabase возвращает готовый публичный URL
    return drawing.url || '';
  };

  // Если Supabase не настроен - показываем предупреждение
  if (!supabaseReady) {
    return (
      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-xs text-yellow-800">
            Supabase не настроен. См. <span className="font-mono font-semibold">SUPABASE_SETUP.md</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* ЗАГОЛОВОК С КНОПКОЙ */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Чертежи ({activeDrawings.length})
          </span>
        </div>

        {/* Кнопка загрузки (только для админов) */}
        {isAdmin && (
          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer transition">
            {uploading ? (
              <>
                <Loader size={12} className="animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Upload size={12} />
                Загрузить
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
        <div className="mb-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Список чертежей */}
      {activeDrawings.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-400">
          <FileText size={24} className="mx-auto mb-1 opacity-30" />
          <p>Чертежи не загружены</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activeDrawings.map((drawing) => (
            <div
              key={drawing.publicId}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-blue-300 hover:shadow-sm transition group"
            >
              {/* Иконка PDF */}
              <FileText size={16} className="text-red-500 flex-shrink-0" />

              {/* Информация о файле */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {drawing.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatFileSize(drawing.size)} • {formatDate(drawing.uploadedAt)}
                </p>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Скачать */}
                <a
                  href={getDownloadUrl(drawing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Открыть/Скачать"
                >
                  <Download size={14} />
                </a>

                {/* Удалить (только для админов) */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(drawing)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
