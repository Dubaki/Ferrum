import { useState, useRef } from 'react';
import { X, Package, Calendar, FileText, Clock, Check, Truck, CreditCard, History, Trash2, Upload, Eye, ChevronDown } from 'lucide-react';
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
  const [showItems, setShowItems] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  // Определение доступных действий на основе роли и статуса
  const canAttachInvoice = canPerformAction(userRole, 'attachInvoice') && ['with_supplier', 'new', 'invoice_requested'].includes(request.status);
  const canSubmitForApproval = canPerformAction(userRole, 'submitForApproval') && request.status === 'invoice_attached';
  const canApproveTechnologist = canPerformAction(userRole, 'approveTechnologist') && request.status === 'pending_tech_approval';
  const canApproveShopManager = canPerformAction(userRole, 'approveShopManager') && request.status === 'pending_shop_approval';
  const canApproveDirector = canPerformAction(userRole, 'approveDirector') && request.status === 'pending_director_approval';
  const canMarkPaid = canPerformAction(userRole, 'markPaid') && request.status === 'pending_payment';
  const canSetDelivery = canPerformAction(userRole, 'setDeliveryDate') && request.status === 'paid';
  const canMarkDelivered = canPerformAction(userRole, 'markDelivered') && request.status === 'awaiting_delivery';

  // Возможность отклонения
  const canReject = canPerformAction(userRole, 'rejectRequest') &&
    ['pending_tech_approval', 'pending_shop_approval', 'pending_director_approval', 'pending_payment'].includes(request.status);

  // Возможность удаления
  const canDelete = canPerformAction(userRole, 'deleteRequest');

  // Обработка загрузки файла счёта
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Файл слишком большой (макс. 10 МБ)');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Допустимые форматы: PDF, JPG, PNG, GIF');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      await supplyActions.attachInvoice(request.id, file);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Ошибка загрузки файла.');
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

  // Определяем, есть ли основное действие для отображения в шапке
  const hasMainAction = canSubmitForApproval || canApproveTechnologist || canApproveShopManager || canApproveDirector || canMarkPaid || canSetDelivery || canMarkDelivered;

  const handleMainAction = () => {
    if (canSubmitForApproval) { supplyActions.submitForApproval(request.id); onClose(); }
    else if (canApproveTechnologist) { supplyActions.approveTechnologist(request.id); onClose(); }
    else if (canApproveShopManager) { supplyActions.approveShopManager(request.id); onClose(); }
    else if (canApproveDirector) { supplyActions.approveDirector(request.id); onClose(); }
    else if (canMarkPaid) { supplyActions.markPaid(request.id); onClose(); }
    else if (canSetDelivery) { setShowDeliveryModal(true); }
    else if (canMarkDelivered) { supplyActions.markDelivered(request.id); onClose(); }
  };

  const getMainActionLabel = () => {
    if (canSubmitForApproval) return 'На согласование';
    if (canApproveTechnologist || canApproveShopManager || canApproveDirector) return 'Согласовать';
    if (canMarkPaid) return 'Оплачено';
    if (canSetDelivery) return 'Назначить срок';
    if (canMarkDelivered) return 'Доставлено';
    return '';
  };

  const getActionIcon = () => {
    if (canMarkPaid) return <CreditCard size={18} />;
    if (canSetDelivery) return <Calendar size={18} />;
    if (canMarkDelivered) return <Truck size={18} />;
    return <Check size={18} />;
  }

  const shortStatusLabel = statusInfo.label.replace('Снабжение — ', '').replace('Согласование — ', '').replace('Бухгалтерия — ', '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl sm:rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="text-cyan-600 shrink-0" size={20} />
              <span className="text-lg font-bold text-slate-800">{request.requestNumber}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color} text-white truncate max-w-[120px] sm:max-w-none`}>
                <span className="sm:hidden">{shortStatusLabel}</span>
                <span className="hidden sm:inline">{statusInfo.label}</span>
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition shrink-0">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Кнопки действий */}
          {(hasMainAction || canReject) && (
            <div className="flex gap-2">
              {hasMainAction && (
                <button
                  onClick={handleMainAction}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  {getActionIcon()}
                  {getMainActionLabel()}
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className={`${hasMainAction ? 'px-4' : 'flex-1 px-4'} py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md`}
                >
                  <X size={18} />
                  Отклонить
                </button>
              )}
            </div>
          )}
        </div>

        {/* Содержимое */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.gif"
            className="hidden"
          />

          {canAttachInvoice && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-yellow-800">Прикрепите счёт</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Загрузка...' : 'Выбрать'}
                </button>
              </div>
              {uploadError && <div className="text-red-600 text-xs mt-2">{uploadError}</div>}
            </div>
          )}

          {request.invoiceFile && (
            <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2.5">
              <div className="flex items-center gap-2 text-blue-700 text-sm min-w-0">
                <FileText size={16} className="shrink-0" />
                <span className="truncate">{request.invoiceFileName || 'Счёт'}</span>
              </div>
              <button onClick={() => setShowPreview(true)} className="px-2.5 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1">
                <Eye size={12} />
                Открыть
              </button>
            </div>
          )}
          
          {(items.length > 0 || legacyTitle) && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setShowItems(!showItems)} className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Package size={14} />Позиции {items.length > 0 ? `(${items.length})` : ''}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showItems ? 'rotate-180' : ''}`} />
              </button>
              {showItems && (
                <div className="p-2 space-y-1.5 bg-white border-t border-slate-100">
                  {items.length > 0 ? items.map((item, idx) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      <div className="font-medium text-slate-800">{item.title}</div>
                      <div className="text-slate-500 text-xs">{item.quantity} {item.unit}</div>
                    </div>
                  )) : (
                    <div className="text-sm p-2 bg-slate-50 rounded">
                      <div className="font-medium text-slate-800">{legacyTitle}</div>
                      <div className="text-slate-500 text-xs">{legacyQuantity} {legacyUnit}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {(orders.length > 0 || legacyOrderNumber) && (
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-slate-400 mb-0.5">Заказ</div>
                <div className="font-medium text-slate-700 truncate">{orders.length > 0 ? orders.map(o => o.orderNumber).join(', ') : legacyOrderNumber}</div>
              </div>
            )}
            {request.desiredDate && (
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-slate-400 mb-0.5">Желаемая дата</div>
                <div className="font-medium text-slate-700">{formatDate(request.desiredDate)}</div>
              </div>
            )}
            {request.deliveryDate && <div className="bg-cyan-50 p-2 rounded-lg"><div className="text-cyan-500 mb-0.5">Срок доставки</div><div className="font-medium text-cyan-700">{formatDate(request.deliveryDate)}</div></div>}
            {request.deliveredAt && <div className="bg-green-50 p-2 rounded-lg"><div className="text-green-500 mb-0.5">Доставлено</div><div className="font-medium text-green-700">{formatDate(request.deliveredAt)}</div></div>}
            <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-400 mb-0.5">Создано</div><div className="font-medium text-slate-700">{formatDateTime(request.createdAt)}</div></div>
          </div>

          {(request.approvals?.technologist || request.approvals?.shopManager || request.approvals?.director || request.approvals?.accountant) && (
            <div className="flex flex-wrap gap-1.5">
              {request.approvals?.technologist && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"><Check size={10} /> Технолог</span>}
              {request.approvals?.shopManager && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"><Check size={10} /> Нач. цеха</span>}
              {request.approvals?.director && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"><Check size={10} /> Директор</span>}
              {request.approvals?.accountant && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"><Check size={10} /> Бухгалтер</span>}
            </div>
          )}

          {request.statusHistory && request.statusHistory.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><History size={14} />История ({request.statusHistory.length})</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="p-2 space-y-1 bg-white border-t border-slate-100 max-h-32 overflow-y-auto">
                  {request.statusHistory.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="text-xs text-slate-600 p-1.5 bg-slate-50 rounded">
                      <span className="text-slate-400">{formatDateTime(entry.timestamp)}</span><span className="mx-1">—</span><span>{entry.note || SUPPLY_STATUSES[entry.status]?.label || entry.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {canDelete && (
            <div className="pt-2">
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center justify-center gap-1.5">
                <Trash2 size={14} />Удалить заявку
              </button>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4"><h3 className="font-bold text-lg text-slate-800 mb-4">Причина отклонения</h3><textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Укажите причину..." rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4" /><div className="flex gap-2"><button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium">Отмена</button><button onClick={handleReject} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">Отклонить</button></div></div></div>}
      {showDeleteConfirm && <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4"><h3 className="font-bold text-lg text-slate-800 mb-2">Удалить заявку?</h3><p className="text-slate-600 mb-4">Это действие нельзя отменить.</p><div className="flex gap-2"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium">Отмена</button><button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">Удалить</button></div></div></div>}
      {showDeliveryModal && <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4"><h3 className="font-bold text-lg text-slate-800 mb-4">Назначить срок доставки</h3><input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4" /><div className="flex gap-2"><button onClick={() => { setShowDeliveryModal(false); setDeliveryDate(''); }} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium">Отмена</button><button onClick={handleSetDeliveryDate} disabled={!deliveryDate} className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50">Назначить</button></div></div></div>}
      {showPreview && request.invoiceFile && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPreview(false)}><div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex-shrink-0"><div className="flex items-center gap-2"><FileText className="text-blue-600" size={20} /><span className="font-medium text-slate-800 truncate">{request.invoiceFileName || 'Счёт'}</span></div><button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-200 rounded-lg transition"><X size={20} className="text-slate-500" /></button></div><div className="flex-1 overflow-auto p-2 bg-slate-100 flex items-center justify-center min-h-[400px]">{isImageFile ? <img src={request.invoiceFile} alt="Счёт" className="max-w-full max-h-[75vh] object-contain rounded shadow-lg" /> : isPdfFile ? <iframe src={request.invoiceFile} className="w-full h-[75vh] rounded bg-white" title="Предпросмотр счёта" /> : <div className="text-center text-slate-600 p-8"><FileText size={48} className="mx-auto mb-4 text-slate-400" /><p>Предпросмотр недоступен для этого типа файла</p></div>}</div></div></div>}
    </div>
  );
}
