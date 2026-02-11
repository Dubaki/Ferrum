import { useMemo } from 'react';
import { Package, Truck, MessageSquare, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { SUPPLY_STATUSES, getHoursUntilDeadline, getRoleLabel } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, onOpenDetails, onOpenInvoice, onDelete }) {
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.with_supplier;

  // NEW: Dynamic status label calculation
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

  const handleInvoiceClick = (e, invoice) => { // Теперь принимает invoice
    e.stopPropagation();
    onOpenInvoice(invoice.url); // Передаем URL конкретного счета
  };



  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите удалить заявку ${request.requestNumber}?`)) {
      onDelete(request.id);
    }
  };
  
      const canDelete = userRole && ['technologist', 'shopManager', 'director'].includes(userRole);
  const alertToShow = deliveryAlert || deadlineAlert;

  return (
    <div
      className={`bg-white rounded-lg border transition-all duration-150 active:scale-[0.99] cursor-pointer hover:border-slate-300 hover:shadow-sm relative`}
      onClick={onOpenDetails}
    >

      <div className="grid grid-cols-[auto_auto_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 p-2">
        {/* Col 1: Status Indicator */}
        <span className={`w-1.5 h-8 rounded-full ${statusInfo.color} flex-shrink-0`}></span>
        
        {/* Col 2: Request Number */}
        <div className="font-mono font-bold text-slate-800 text-sm whitespace-nowrap">{request.requestNumber}</div>
        
        {/* Col 3 & 4: Item Info (Flexible) or Rejection Message */}
        {request.status !== 'rejected' ? (
          <>
            {/* Original Col 3: Item Info (Flexible) */}
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
            {/* Original Col 4: creatorComment (Flexible) - Made more visible */}
            <div className="flex items-center gap-1.5 text-slate-700 min-w-0" title={request.creatorComment}>
                {request.creatorComment && (
                    <>
                        <MessageSquare size={14} className="flex-shrink-0" />
                        <span className="truncate text-xs font-semibold">{request.creatorComment}</span>
                    </>
                )}
            </div>
          </>
        ) : (
          /* Replacement for Col 3 & 4 when rejected */
          <div className="col-span-2 flex items-center justify-start bg-red-500 rounded px-2 py-1 text-white text-sm font-semibold whitespace-nowrap overflow-hidden">
            ОТКЛОНЕНО: {request.rejectionReason}
            {request.rejectedByRole && (
              <span className="ml-1"> (Кем: {getRoleLabel(request.rejectedByRole)})</span>
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
        </div>



        {/* Col 6: Invoice Button */}
        <div className="w-8 h-8 flex items-center justify-center">
          {request.invoices && request.invoices.length > 0 && ( // Если есть счета
            <button 
              onClick={(e) => handleInvoiceClick(e, request.invoices[0])} // Открываем первый счет
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

        {/* Col 8: Status Label */}
        <div className="text-right">
            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${statusInfo.color} whitespace-nowrap`}>
                {statusLabel}
            </span>
        </div>

      </div>
    </div>
  );
}
