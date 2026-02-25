import { useState } from 'react';
import { FileText, Upload, Eye, Trash2, AlertCircle, Loader, Cpu, Zap, Check } from 'lucide-react';
import { uploadDrawing, deleteDrawing, isSupabaseConfigured } from '../../utils/supabaseStorage';
import { parseDrawingWithAI } from '../../utils/aiParser';

/**
 * Компактная секция для загрузки и просмотра PDF чертежей заказа
 */
export default function DrawingsSection({ order, actions, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null); // ID чертежа который сейчас анализируется AI
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

  const handleAIParse = async (drawing) => {
    if (analyzingId) return;
    
    setAnalyzingId(drawing.publicId);
    setError('');

    try {
      // 1. Отправляем на "анализ" (скриптовый или AI)
      const result = await parseDrawingWithAI(drawing.url, drawing.name);

      if (result && result.marks && result.marks.length > 0) {
        // 2. Подготавливаем данные для создания изделий
        // Превращаем формат AI в формат для addProductsBatch
        const marksToAdd = result.marks.map(m => ({
          name: m.id,
          weight_kg: m.weight_kg,
          quantity: m.quantity,
          category: m.category || 'other',
          sizeCategory: m.sizeCategory || 'medium',
          complexity: m.complexity || 'medium',
          hasProfileCut: m.hasProfileCut,
          hasSheetCut: m.hasSheetCut
        }));

        // 3. Создаем изделия в заказе
        if (confirm(`AI нашел ${marksToAdd.length} марок общим весом ${result.total_tonnage || '?'} т. Добавить в заказ?`)) {
          await actions.addProductsBatch(order.id, marksToAdd);
        }
      } else {
        throw new Error('AI не нашел марок в этом чертеже');
      }
    } catch (err) {
      setError(`AI ошибка: ${err.message}`);
    } finally {
      setAnalyzingId(null);
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

  // Получить URL для просмотра PDF в браузере (inline)
  const getViewUrl = (drawing) => {
    const url = drawing.url || '';
    if (!url) return '';

    // Проверка мобильного устройства
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // На мобильных устройствах используем Google Docs Viewer для надежного просмотра
    if (isMobile) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }

    // На десктопе - прямой URL
    return url;
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
          {isAdmin ? (
            <FileText size={16} className="text-blue-600" />
          ) : (
            <Eye size={16} className="text-blue-600" />
          )}
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Чертежи ({activeDrawings.length})
          </span>
        </div>

        {/* Кнопка загрузки (только для админов) */}
        {isAdmin && (
          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer transition shadow-sm hover:shadow-md">
            {uploading ? (
              <>
                <Loader size={12} className="animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Upload size={12} />
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
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 animate-in shake-in-1">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Список чертежей */}
      {activeDrawings.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
          <FileText size={24} className="mx-auto mb-1 opacity-20" />
          <p>Чертежи не загружены</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activeDrawings.map((drawing) => (
            <div
              key={drawing.publicId}
              className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              {/* Иконка PDF */}
              <FileText size={16} className="text-red-500 flex-shrink-0" />

              {/* Информация о файле */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {drawing.name}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {formatFileSize(drawing.size)} • {formatDate(drawing.uploadedAt)}
                </p>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-1 flex-shrink-0">
                
                {/* AI АНАЛИЗ */}
                {isAdmin && (
                  <button
                    onClick={() => handleAIParse(drawing)}
                    disabled={analyzingId !== null}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      analyzingId === drawing.publicId 
                        ? 'bg-orange-100 text-orange-600 animate-pulse' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                    }`}
                    title="Распознать марки через AI"
                  >
                    {analyzingId === drawing.publicId ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        AI думает...
                      </>
                    ) : (
                      <>
                        <Cpu size={12} />
                        AI Парсинг
                      </>
                    )}
                  </button>
                )}

                {/* Просмотреть в браузере */}
                <a
                  href={getViewUrl(drawing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Открыть в новой вкладке"
                >
                  <Eye size={14} />
                </a>

                {/* Удалить (только для админов) */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(drawing)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"
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
