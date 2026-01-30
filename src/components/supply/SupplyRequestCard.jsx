import { useMemo } from 'react';
import { Package, Truck, MessageSquare, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { SUPPLY_STATUSES, getHoursUntilDeadline } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, onOpenDetails, onOpenInvoice, onDelete }) {
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.with_supplier;

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

  const handleInvoiceClick = (e) => {
    e.stopPropagation();
    onOpenInvoice(request.invoiceFile);
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
      className={`bg-white rounded-lg border transition-all duration-150 active:scale-[0.99] cursor-pointer hover:border-slate-300 hover:shadow-sm`}
      onClick={onOpenDetails}
    >
      <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-2 p-2">
        {/* Col 1: Status Indicator */}
        <span className={`w-1.5 h-8 rounded-full ${statusInfo.color} flex-shrink-0`}></span>
        
        {/* Col 2: Request Number */}
        <div className="font-mono font-bold text-slate-800 text-sm whitespace-nowrap pr-2">{request.requestNumber}</div>
        
        {/* Col 3: Item Info (Flexible) */}
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

        {/* Col 4: Icons (Comment/Alerts) */}
        <div className="flex items-center justify-end gap-2">
          {request.creatorComment && (
            <MessageSquare size={16} className="text-slate-400" title={request.creatorComment} />
          )}
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

        {/* Col 5: Invoice Button */}
        <div className="w-8 h-8 flex items-center justify-center">
          {request.invoiceFile && (
            <button 
              onClick={handleInvoiceClick}
              className="h-full w-full rounded-md bg-cyan-50 text-cyan-600 hover:bg-cyan-100 flex items-center justify-center transition"
              title="Просмотреть счет"
            >
              <Eye size={16} />
            </button>
          )}
        </div>

        {/* Col 6: Delete Button */}
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

        {/* Col 7: Status Label */}
        <div className="text-right">
            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${statusInfo.color} whitespace-nowrap`}>
                {statusInfo.label}
            </span>
        </div>

      </div>
    </div>
  );
}
