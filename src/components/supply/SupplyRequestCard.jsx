import { useMemo } from 'react';
import { FileText, Calendar, Package, Check, Truck, CreditCard, Clock, AlertTriangle, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { SUPPLY_STATUSES, canPerformAction, getDaysUntilDeadline } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, supplyActions, onOpenDetails, onOpenDeliveryModal, showOverdueIndicator }) {
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.new;

  // Дедлайн заявки
  const daysUntilDeadline = getDaysUntilDeadline(request);
  const deadlineAlert = useMemo(() => {
    if (daysUntilDeadline === null || request.status === 'delivered') return null;

    if (daysUntilDeadline < 0) return { type: 'overdue', label: `Просрочено на ${Math.abs(daysUntilDeadline)} дн`, color: 'text-red-600 bg-red-50 border-red-200' };
    if (daysUntilDeadline === 0) return { type: 'today', label: 'Дедлайн сегодня', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (daysUntilDeadline === 1) return { type: 'tomorrow', label: 'Осталось 1 день', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return null;
  }, [daysUntilDeadline, request.status]);

  // Получаем данные с учетом старого и нового формата
  const items = request.items || [];
  const orders = request.orders || [];

  // Для обратной совместимости со старым форматом
  const legacyTitle = request.title;
  const legacyQuantity = request.quantity;
  const legacyUnit = request.unit;
  const legacyOrderNumber = request.orderNumber;

  // Проверка, требует ли заявка внимания (срок доставки близок)
  const deliveryAlert = useMemo(() => {
    if (request.status !== 'awaiting_delivery' || !request.deliveryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(request.deliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { type: 'overdue', label: 'Просрочено', color: 'text-red-600 bg-red-50' };
    if (diffDays === 0) return { type: 'today', label: 'Сегодня', color: 'text-orange-600 bg-orange-50' };
    if (diffDays === 1) return { type: 'tomorrow', label: 'Завтра', color: 'text-yellow-600 bg-yellow-50' };
    return null;
  }, [request]);

  // Форматирование даты
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Определение доступных действий (новый workflow)
  const canAttachInvoice = canPerformAction(userRole, 'attachInvoice') && request.status === 'with_supplier';
  const canApproveTech = canPerformAction(userRole, 'approveTech') && request.status === 'invoice_attached';
  const canRejectTech = canPerformAction(userRole, 'rejectRequest') && request.status === 'invoice_attached';
  const canApproveShop = canPerformAction(userRole, 'approveShopManager') && request.status === 'tech_approved';
  const canRejectShop = canPerformAction(userRole, 'rejectRequest') && request.status === 'tech_approved';
  const canApproveDir = canPerformAction(userRole, 'approveDirector') && request.status === 'shop_approved';
  const canRejectDir = canPerformAction(userRole, 'rejectRequest') && request.status === 'shop_approved';
  const canMarkPaid = canPerformAction(userRole, 'markPaid') && request.status === 'director_approved';
  const canSetDelivery = canPerformAction(userRole, 'setDeliveryDate') && request.status === 'paid';
  const canMarkDelivered = canPerformAction(userRole, 'markDelivered') && request.status === 'awaiting_delivery';

  const hasAction = canAttachInvoice || canApproveTech || canRejectTech || canApproveShop || canRejectShop ||
    canApproveDir || canRejectDir || canMarkPaid || canSetDelivery || canMarkDelivered;

  // Отображение позиций (краткое)
  const itemsSummary = items.length > 0
    ? items.length === 1
      ? `${items[0].title} - ${items[0].quantity} ${items[0].unit}`
      : `${items.length} позиций`
    : legacyTitle
      ? `${legacyTitle} - ${legacyQuantity} ${legacyUnit}`
      : 'Нет позиций';

  // Отображение заказов
  const ordersSummary = orders.length > 0
    ? orders.map(o => o.orderNumber).join(', ')
    : legacyOrderNumber || null;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition hover:shadow-md cursor-pointer ${
        deadlineAlert
          ? deadlineAlert.color.includes('red')
            ? 'border-red-300 bg-red-50/20'
            : 'border-orange-300 bg-orange-50/20'
          : deliveryAlert
            ? 'border-orange-300'
            : 'border-slate-200'
      }`}
      onClick={onOpenDetails}
    >
      <div className="p-4">
        {/* Верхняя строка: номер, статус, дедлайн */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-800">{request.requestNumber}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color} text-white`}>
              {statusInfo.label}
            </span>
            {deadlineAlert && (
              <span className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 ${deadlineAlert.color}`}>
                <AlertTriangle size={12} />
                {deadlineAlert.label}
              </span>
            )}
            {!deadlineAlert && daysUntilDeadline !== null && daysUntilDeadline >= 0 && (
              <span className="px-2 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock size={12} />
                Осталось {daysUntilDeadline} дн
              </span>
            )}
            {deliveryAlert && (
              <span className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 ${deliveryAlert.color}`}>
                <Truck size={12} />
                {deliveryAlert.label}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Calendar size={12} />
            {formatDate(request.createdAt)}
          </div>
        </div>

        {/* Позиции */}
        {items.length > 0 ? (
          <div className="mb-3">
            {items.length <= 3 ? (
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Package size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-800 font-medium truncate">{item.title}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-slate-600 whitespace-nowrap">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Package size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-800 font-medium truncate">{item.title}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-slate-600 whitespace-nowrap">{item.quantity} {item.unit}</span>
                  </div>
                ))}
                <div className="text-sm text-slate-400 pl-6">
                  +{items.length - 2} ещё...
                </div>
              </div>
            )}
          </div>
        ) : legacyTitle && (
          <div className="mb-3">
            <h3 className="font-medium text-slate-800">{legacyTitle}</h3>
            {request.description && (
              <p className="text-sm text-slate-500 line-clamp-1">{request.description}</p>
            )}
          </div>
        )}

        {/* Информация */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {/* Общее количество позиций */}
          {items.length > 1 && (
            <div className="flex items-center gap-1">
              <Package size={14} className="text-slate-400" />
              <span>{items.length} позиций</span>
            </div>
          )}

          {/* Заказы */}
          {ordersSummary && (
            <div className="flex items-center gap-1">
              <FileText size={14} className="text-slate-400" />
              <span className="truncate max-w-[200px]">
                {orders.length > 1 ? `Заказы: ${ordersSummary}` : `Заказ: ${ordersSummary}`}
              </span>
            </div>
          )}

          {/* Желаемая дата */}
          {request.desiredDate && (
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              <span>Нужно к: {formatDate(request.desiredDate)}</span>
            </div>
          )}

          {/* Срок доставки */}
          {request.deliveryDate && (
            <div className={`flex items-center gap-1 ${deliveryAlert ? deliveryAlert.color.split(' ')[0] : ''}`}>
              <Truck size={14} />
              <span>Доставка: {formatDate(request.deliveryDate)}</span>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        {hasAction && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            {/* Снабженец: прикрепить счет */}
            {canAttachInvoice && (
              <button
                onClick={onOpenDetails}
                className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 transition flex items-center gap-1"
              >
                <FileText size={14} />
                Прикрепить счёт
              </button>
            )}

            {/* Технолог: согласовать */}
            {canApproveTech && (
              <>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-1"
                >
                  <Check size={14} />
                  Согласовать
                </button>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition flex items-center gap-1"
                >
                  <X size={14} />
                  Отказать
                </button>
              </>
            )}

            {/* Начальник цеха: согласовать */}
            {canApproveShop && (
              <>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition flex items-center gap-1"
                >
                  <Check size={14} />
                  Согласовать
                </button>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition flex items-center gap-1"
                >
                  <X size={14} />
                  Отказать
                </button>
              </>
            )}

            {/* Директор: согласовать */}
            {canApproveDir && (
              <>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-indigo-500 text-white rounded text-sm font-medium hover:bg-indigo-600 transition flex items-center gap-1"
                >
                  <Check size={14} />
                  Согласовать
                </button>
                <button
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition flex items-center gap-1"
                >
                  <X size={14} />
                  Отказать
                </button>
              </>
            )}

            {/* Бухгалтер: оплачено */}
            {canMarkPaid && (
              <button
                onClick={() => supplyActions.markPaid(request.id)}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-1"
              >
                <CreditCard size={14} />
                Оплачено
              </button>
            )}

            {/* Снабженец: указать срок доставки */}
            {canSetDelivery && (
              <button
                onClick={onOpenDeliveryModal}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded text-sm font-medium hover:bg-cyan-600 transition flex items-center gap-1"
              >
                <Calendar size={14} />
                Указать срок доставки
              </button>
            )}

            {/* Начальник цеха/Мастер: принять груз */}
            {canMarkDelivered && (
              <button
                onClick={() => supplyActions.markDelivered(request.id)}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
              >
                <Check size={14} />
                Принято
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
