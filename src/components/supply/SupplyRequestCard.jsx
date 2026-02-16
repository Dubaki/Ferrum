import { useState, useMemo } from 'react';
import { Package, Truck, MessageSquare, AlertTriangle, Eye, Trash2, X, Info, ListChecks } from 'lucide-react';
import { SUPPLY_STATUSES, getHoursUntilDeadline, getRoleLabel } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, onOpenDetails, onOpenInvoice, onDelete, supplyActions }) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.with_supplier;

  const statusLabel = useMemo(() => {
    if (request.status === 'rejected' && request.invoiceRequestCount) {
      const count = request.invoiceRequestCount;
      let countText = '';
      if (count === 1) {
        countText = 'повторный';
      } else {
        countText = `${count + 1}-й`;
      }
      return `Снабжение - ${countText} запрос счёта`;
    }
    return statusInfo.label;
  }, [request.status, request.invoiceRequestCount, statusInfo.label]);

  const hoursUntilDeadline = getHoursUntilDeadline(request);
  const deadlineAlert = useMemo(() => {
    if (hoursUntilDeadline === null || request.status === 'delivered') return null;
    if (hoursUntilDeadline < 0) return { type: 'overdue', label: `−${Math.abs(hoursUntilDeadline)}ч` };
    if (hoursUntilDeadline <= 2) return { type: 'urgent', label: `${hoursUntilDeadline}ч` };
    return null;
  }, [hoursUntilDeadline, request.status]);

  const deliveryAlert = useMemo(() => {
    if (request.status !== 'awaiting_delivery' || !request.deliveryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = request.deliveryDate.toDate ? request.deliveryDate.toDate() : new Date(request.deliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { type: 'overdue', label: 'Просрочено' };
    if (diffDays === 0) return { type: 'today', label: 'Сегодня' };
    if (diffDays === 1) return { type: 'tomorrow', label: 'Завтра' };
    return null;
  }, [request.status, request.deliveryDate]);

  const firstItem = request.items && request.items.length > 0 ? request.items[0] : null;

  const handleInvoiceClick = (e, invoice) => {
    e.stopPropagation();
    onOpenInvoice(invoice.url);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleRejectReasonClick = (e) => {
    e.stopPropagation();
    setShowRejectReason(true);
  };

  const canDelete = userRole && ['technologist', 'shopManager', 'director'].includes(userRole);
  const alertToShow = deliveryAlert || deadlineAlert;
  const isRejected = (request.status === 'rejected' || request.rejectionReason) &&
    ['rejected', 'with_supplier', 'invoice_attached', 'pending_tech_approval'].includes(request.status);

  return (
    <>
      <div
        className={`rounded-lg transition-all duration-150 active:scale-[0.99] cursor-pointer hover:shadow-sm relative ${isRejected ? 'bg-red-50 border-2 border-red-400' : 'bg-white border border-slate-200 hover:border-slate-300'}`}
        onClick={onOpenDetails}
      >
        <div className="grid grid-cols-[auto_auto_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto_auto_auto_auto] items-center gap-3 p-2">
          {/* Col 1: Status Indicator */}
          <span className={`w-1.5 h-8 rounded-full ${statusInfo.color} flex-shrink-0`}></span>

          {/* Col 2: Request Number */}
          <div className="font-mono font-bold text-slate-800 text-sm whitespace-nowrap">{request.requestNumber}</div>

          {/* Col 3 & 4: Item Info / Comment ИЛИ причина отклонения */}
          {/* Col 3: Item Info (всегда) */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            {firstItem ? (
              <>
                <Package size={14} className="text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 truncate font-medium">{firstItem.title}</span>
                {request.items.length > 1 && <span className="text-slate-400 text-xs whitespace-nowrap">+{request.items.length - 1}</span>}
              </>
            ) : (
              <span className="text-slate-400 italic">Нет позиций</span>
            )}
          </div>
          {/* Col 4: Причина отклонения ИЛИ комментарий */}
          {isRejected ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={handleRejectReasonClick}
                className="flex items-center gap-1 min-w-0 px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 rounded text-red-700 transition"
                title="Нажмите чтобы прочитать причину"
              >
                <AlertTriangle size={12} className="flex-shrink-0" />
                <span className="text-xs font-semibold truncate">{request.rejectionReason || 'Отклонено'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-700 min-w-0" title={request.creatorComment}>
              {request.creatorComment && (
                <>
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="truncate text-xs font-semibold">{request.creatorComment}</span>
                </>
              )}
            </div>
          )}

          {/* Col 5: Icons (Alerts) */}
          <div className="flex items-center justify-end gap-2">
            {alertToShow && (
              <div className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 whitespace-nowrap
                  ${alertToShow.type === 'overdue' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                  ${alertToShow.type === 'urgent' ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}
                  ${alertToShow.type === 'today' || alertToShow.type === 'tomorrow' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
              `}>
                  {deliveryAlert ? <Truck size={12} /> : <AlertTriangle size={12} />}
                  <span>{alertToShow.label}</span>
              </div>
            )}
            {(request.supplierAddress || request.supplierPhone) && (
                <div
                    className="relative flex items-center justify-center p-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition group"
                    title={`Адрес: ${request.supplierAddress || 'не указан'}\nТелефон: ${request.supplierPhone || 'не указан'}`}
                >
                    <Info size={14} />
                </div>
            )}
          </div>

          {/* Col 6: Invoice Button */}
          <div className="w-8 h-8 flex items-center justify-center">
            {request.invoices && request.invoices.length > 0 && (
              <button
                onClick={(e) => handleInvoiceClick(e, request.invoices[0])}
                className="h-full w-full rounded-md bg-cyan-50 text-cyan-600 hover:bg-cyan-100 flex items-center justify-center transition"
                title="Просмотреть первый счёт"
              >
                <Eye size={16} />
              </button>
            )}
          </div>

          {/* Col 7: Delete Button */}
          <div className="w-8 h-8 flex items-center justify-center">
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="h-full w-full rounded-md bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition"
                title="Удалить заявку"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Col 8: New Queue Button */}
          <div className="w-8 h-8 flex items-center justify-center">
            {userRole === 'vesta' && request.status === 'pending_payment' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Поставить заявку в очередь на оплату?')) {
                    supplyActions.markAsInQueue(request.id);
                  }
                }}
                className="h-full w-full rounded-md bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition"
                title="В очередь на оплату"
              >
                <ListChecks size={16} />
              </button>
            )}
          </div>

          {/* Col 9: Status Label */}
          <div className="text-right">
            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${statusInfo.color} whitespace-nowrap`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Модалка с причиной отклонения */}
      {showRejectReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRejectReason(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-lg">Заявка отклонена</h3>
              </div>
              <button onClick={() => setShowRejectReason(false)} className="p-1 hover:bg-slate-100 rounded-lg transition">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-500">Заявка: <span className="font-bold text-slate-800">{request.requestNumber}</span></div>
              {request.rejectedByRole && (
                <div className="text-sm text-slate-500">Отклонил: <span className="font-bold text-slate-800">{getRoleLabel(request.rejectedByRole)}</span></div>
              )}
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm leading-relaxed">
                {request.rejectionReason || 'Причина не указана'}
              </div>
            </div>
            <button
              onClick={() => setShowRejectReason(false)}
              className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Удалить заявку {request.requestNumber}?</h3>
            <p className="text-slate-500 text-sm mb-4">Заявка и все прикреплённые счета будут удалены. Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium">Отмена</button>
              <button onClick={() => { setShowDeleteConfirm(false); onDelete(request.id); }} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
