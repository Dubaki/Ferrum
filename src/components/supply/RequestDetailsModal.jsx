import { useState, useRef } from 'react';
import { X, Package, Calendar, FileText, Clock, Check, Truck, CreditCard, ChevronRight, History, AlertTriangle, Trash2, Upload, Eye } from 'lucide-react';
import { SUPPLY_STATUSES, canPerformAction } from '../../utils/supplyRoles';

export default function RequestDetailsModal({ request, userRole, supplyActions, onClose }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Определяем тип файла для предпросмотра
  const isImageFile = request.invoiceFileName?.match(/\.(jpg|jpeg|png|gif)$/i) ||
                      request.invoiceFile?.match(/\.(jpg|jpeg|png|gif)/i);
  const isPdfFile = request.invoiceFileName?.match(/\.pdf$/i) ||
                    request.invoiceFile?.match(/\.pdf/i);

  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.with_supplier;

  // Получаем данные с учетом старого и нового формата
  const items = request.items || [];
  const orders = request.orders || [];

  // Для обратной совместимости со старым форматом
  const legacyTitle = request.title;
  const legacyQuantity = request.quantity;
  const legacyUnit = request.unit;
  const legacyDescription = request.description;
  const legacyOrderNumber = request.orderNumber;

  // Форматирование даты
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Определение доступных действий (включая старые статусы для совместимости)
  const canAttachInvoice = canPerformAction(userRole, 'attachInvoice') && ['with_supplier', 'new', 'invoice_requested'].includes(request.status);
  const canSubmitForApproval = canPerformAction(userRole, 'submitForApproval') && request.status === 'invoice_attached';
  const canApproveTechnologist = canPerformAction(userRole, 'approveTechnologist') && request.status === 'pending_tech_approval';
  const canApproveShopManager = canPerformAction(userRole, 'approveShopManager') && request.status === 'pending_shop_approval';
  const canApproveDirector = canPerformAction(userRole, 'approveDirector') && request.status === 'pending_director_approval';
  const canMarkPaid = canPerformAction(userRole, 'markPaid') && request.status === 'pending_payment';
  const canSetDelivery = canPerformAction(userRole, 'setDeliveryDate') && request.status === 'paid';
  const canMarkDelivered = canPerformAction(userRole, 'markDelivered') && request.status === 'awaiting_delivery';

  // Возможность отклонения на этапах согласования
  const canReject = canPerformAction(userRole, 'rejectRequest') &&
    ['pending_tech_approval', 'pending_shop_approval', 'pending_director_approval', 'pending_payment'].includes(request.status);

  // Возможность удаления (только admin или создатель в начальном статусе)
  const canDelete = userRole === 'admin' || (['with_supplier', 'new'].includes(request.status) && request.createdBy === userRole);

  // Обработка загрузки файла счёта
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Файл слишком большой (макс. 10 МБ)');
      return;
    }

    // Проверка типа файла
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Допустимые форматы: PDF, JPG, PNG, GIF');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      await supplyActions.attachInvoice(request.id, file);
      onClose(); // Закрываем модалку после успешной загрузки
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Ошибка загрузки файла. Проверьте подключение к интернету.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Обработка назначения срока доставки
  const handleSetDeliveryDate = async () => {
    if (!deliveryDate) return;
    await supplyActions.setDeliveryDate(request.id, deliveryDate);
    setShowDeliveryModal(false);
    setDeliveryDate('');
    onClose();
  };

  const handleReject = async () => {
    await supplyActions.rejectRequest(request.id, userRole, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
    onClose();
  };

  const handleDelete = async () => {
    await supplyActions.deleteRequest(request.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Заголовок - фиксированный сверху */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-cyan-600" size={22} />
              {request.requestNumber}
            </h2>
            <span className={`inline-block mt-1.5 px-2.5 py-1 rounded text-xs font-medium ${statusInfo.color} text-white`}>
              {statusInfo.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition"
          >
            <X size={22} className="text-slate-500" />
          </button>
        </div>

        {/* Содержимое - скроллируемое */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Позиции */}
          {items.length > 0 ? (
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Package size={16} />
                Позиции ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                    <div className="font-medium text-slate-800">{item.title}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {item.quantity} {item.unit}
                      {item.description && (
                        <span className="text-slate-400 ml-2">- {item.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : legacyTitle && (
            <div>
              <h3 className="font-medium text-slate-800 text-lg">{legacyTitle}</h3>
              {legacyDescription && (
                <p className="text-slate-600 mt-1">{legacyDescription}</p>
              )}
              <div className="text-sm text-slate-600 mt-2">
                Количество: {legacyQuantity} {legacyUnit}
              </div>
            </div>
          )}

          {/* Заказы */}
          {(orders.length > 0 || legacyOrderNumber) && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-slate-500 mb-1 flex items-center gap-1 text-sm">
                <FileText size={14} />
                {orders.length > 1 ? 'Заказы' : 'Заказ'}
              </div>
              <div className="font-medium text-slate-800">
                {orders.length > 0
                  ? orders.map(o => o.orderNumber).join(', ')
                  : legacyOrderNumber
                }
              </div>
            </div>
          )}

          {/* Детали */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {request.desiredDate && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar size={14} />
                  Желаемая дата
                </div>
                <div className="font-medium text-slate-800">{formatDate(request.desiredDate)}</div>
              </div>
            )}

            {request.deliveryDate && (
              <div className="bg-cyan-50 p-3 rounded-lg">
                <div className="text-cyan-600 mb-1 flex items-center gap-1">
                  <Truck size={14} />
                  Срок доставки
                </div>
                <div className="font-medium text-cyan-700">{formatDate(request.deliveryDate)}</div>
              </div>
            )}

            {request.deliveredAt && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-green-600 mb-1 flex items-center gap-1">
                  <Check size={14} />
                  Доставлено
                </div>
                <div className="font-medium text-green-700">{formatDate(request.deliveredAt)}</div>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-slate-500 mb-1 flex items-center gap-1">
                <Clock size={14} />
                Создано
              </div>
              <div className="font-medium text-slate-800">{formatDateTime(request.createdAt)}</div>
            </div>
          </div>

          {/* Счёт */}
          {request.invoiceFile && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-600 mb-2 flex items-center gap-1 text-sm">
                <FileText size={14} />
                Счёт
              </div>
              <button
                onClick={() => setShowPreview(true)}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                Просмотреть
              </button>
              <div className="text-xs text-blue-600 mt-2 truncate">
                {request.invoiceFileName}
              </div>
            </div>
          )}

          {/* Согласования */}
          {(request.approvals?.technologist || request.approvals?.shopManager || request.approvals?.director || request.approvals?.accountant) && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Check size={16} />
                Согласования
              </h4>
              <div className="space-y-2 text-sm">
                {request.approvals?.technologist && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check size={14} />
                    Технолог - {formatDateTime(request.approvals.technologistAt)}
                  </div>
                )}
                {request.approvals?.shopManager && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check size={14} />
                    Начальник цеха - {formatDateTime(request.approvals.shopManagerAt)}
                  </div>
                )}
                {request.approvals?.director && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check size={14} />
                    Директор - {formatDateTime(request.approvals.directorAt)}
                  </div>
                )}
                {request.approvals?.accountant && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check size={14} />
                    Бухгалтер - {formatDateTime(request.approvals.accountantAt)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* История статусов */}
          {request.statusHistory && request.statusHistory.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <History size={16} />
                История
              </h4>
              <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                {request.statusHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-600">
                    <span className="text-slate-400 whitespace-nowrap">{formatDateTime(entry.timestamp)}</span>
                    <span className="text-slate-400">-</span>
                    <span>{entry.note || SUPPLY_STATUSES[entry.status]?.label || entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Загрузка счёта (скрытый input) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              className="hidden"
            />

            {canAttachInvoice && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <Upload size={16} />
                  Прикрепите счёт
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Загрузите файл счёта (PDF, JPG, PNG). Максимальный размер: 10 МБ.
                </p>
                {uploadError && (
                  <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-3">
                    {uploadError}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Выбрать файл
                    </>
                  )}
                </button>
              </div>
            )}
            {canSubmitForApproval && (
              <button
                onClick={() => { supplyActions.submitForApproval(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} />
                Отправить на согласование
              </button>
            )}
            {canApproveTechnologist && (
              <button
                onClick={() => { supplyActions.approveTechnologist(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Согласовать (Технолог)
              </button>
            )}
            {canApproveShopManager && (
              <button
                onClick={() => { supplyActions.approveShopManager(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Согласовать (Начальник цеха)
              </button>
            )}
            {canApproveDirector && (
              <button
                onClick={() => { supplyActions.approveDirector(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Согласовать (Директор)
              </button>
            )}
            {canMarkPaid && (
              <button
                onClick={() => { supplyActions.markPaid(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                Подтвердить оплату
              </button>
            )}
            {canSetDelivery && (
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Назначить срок доставки
              </button>
            )}
            {canMarkDelivered && (
              <button
                onClick={() => { supplyActions.markDelivered(request.id); onClose(); }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Подтвердить доставку
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                Отклонить
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Удалить заявку
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно отклонения */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Удалить заявку?</h3>
            <p className="text-slate-600 mb-4">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора даты доставки */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Назначить срок доставки</h3>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeliveryModal(false); setDeliveryDate(''); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleSetDeliveryDate}
                disabled={!deliveryDate}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50"
              >
                Назначить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Предпросмотр файла счёта */}
      {showPreview && request.invoiceFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPreview(false)}>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Заголовок */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                <span className="font-medium text-slate-800 truncate">{request.invoiceFileName || 'Счёт'}</span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Содержимое */}
            <div className="flex-1 overflow-auto p-2 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {isImageFile ? (
                <img
                  src={request.invoiceFile}
                  alt="Счёт"
                  className="max-w-full max-h-[75vh] object-contain rounded shadow-lg"
                />
              ) : isPdfFile ? (
                <iframe
                  src={request.invoiceFile}
                  className="w-full h-[75vh] rounded bg-white"
                  title="Предпросмотр счёта"
                />
              ) : (
                <div className="text-center text-slate-600 p-8">
                  <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                  <p>Предпросмотр недоступен для этого типа файла</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
