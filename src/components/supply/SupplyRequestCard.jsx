import { useMemo } from 'react';
import { FileText, Calendar, Package, Truck, Clock, AlertTriangle } from 'lucide-react';
import { SUPPLY_STATUSES, getHoursUntilDeadline } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, supplyActions, onOpenDetails, onOpenDeliveryModal, showOverdueIndicator }) {
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.with_supplier;

  // Дедлайн заявки (в часах)
  const hoursUntilDeadline = getHoursUntilDeadline(request);
  const deadlineAlert = useMemo(() => {
    if (hoursUntilDeadline === null || request.status === 'delivered') return null;

    if (hoursUntilDeadline < 0) return { type: 'overdue', label: `−${Math.abs(hoursUntilDeadline)}ч`, color: 'text-red-600 bg-red-50 border-red-200' };
    if (hoursUntilDeadline <= 1) return { type: 'urgent', label: '<1ч', color: 'text-red-600 bg-red-50 border-red-200' };
    if (hoursUntilDeadline <= 2) return { type: 'soon', label: `${hoursUntilDeadline}ч`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return null;
  }, [hoursUntilDeadline, request.status]);

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

    if (diffDays < 0) return { type: 'overdue', label: 'Просрочено', color: 'text-red-600 bg-red-50 border-red-200' };
    if (diffDays === 0) return { type: 'today', label: 'Сегодня', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (diffDays === 1) return { type: 'tomorrow', label: 'Завтра', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return null;
  }, [request]);

  // Форматирование даты
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  // Отображение заказов
  const ordersSummary = orders.length > 0
    ? orders.map(o => o.orderNumber).join(', ')
    : legacyOrderNumber || null;

  // Первая позиция для отображения
  const firstItem = items.length > 0 ? items[0] : (legacyTitle ? { title: legacyTitle, quantity: legacyQuantity, unit: legacyUnit } : null);

  // Короткое название статуса для мобильной версии
  const shortStatusLabel = statusInfo.label.replace('Снабжение — ', '').replace('Согласование — ', '').replace('Бухгалтерия — ', '');

  return (
    <div
      className={`bg-white rounded-lg border transition active:scale-[0.99] cursor-pointer ${
        deadlineAlert
          ? deadlineAlert.color.includes('red')
            ? 'border-red-300 bg-red-50/30'
            : 'border-orange-300 bg-orange-50/30'
          : deliveryAlert
            ? 'border-orange-300'
            : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onOpenDetails}
    >
      {/* Мобильная версия */}
      <div className="p-3 sm:hidden">
        {/* Верхняя строка: номер + статус + дедлайн */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-slate-800 text-sm">
              {request.requestNumber}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusInfo.color} text-white`}>
              {shortStatusLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {deadlineAlert && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${deadlineAlert.color}`}>
                <AlertTriangle size={10} />
                {deadlineAlert.label}
              </span>
            )}
            {!deadlineAlert && hoursUntilDeadline !== null && hoursUntilDeadline >= 0 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500 flex items-center gap-0.5">
                <Clock size={10} />
                {hoursUntilDeadline}ч
              </span>
            )}
            {deliveryAlert && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${deliveryAlert.color}`}>
                <Truck size={10} />
                {deliveryAlert.label}
              </span>
            )}
          </div>
        </div>

        {/* Позиция */}
        {firstItem && (
          <div className="flex items-center gap-1.5 text-sm text-slate-700 mb-1">
            <Package size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{firstItem.title}</span>
            {firstItem.quantity && (
              <span className="text-slate-400 shrink-0">• {firstItem.quantity} {firstItem.unit}</span>
            )}
            {items.length > 1 && (
              <span className="text-slate-400 text-xs shrink-0">+{items.length - 1}</span>
            )}
          </div>
        )}

        {/* Нижняя строка: заказ + дата */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {ordersSummary && (
            <span className="flex items-center gap-1 truncate">
              <FileText size={11} />
              {ordersSummary}
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0">
            <Calendar size={11} />
            {formatDate(request.createdAt)}
          </span>
        </div>
      </div>

      {/* Десктоп версия */}
      <div className="hidden sm:flex px-3 py-2 items-center gap-3">
        {/* Номер заявки */}
        <div className="font-mono font-bold text-slate-800 text-sm whitespace-nowrap">
          {request.requestNumber}
        </div>

        {/* Первая позиция */}
        {firstItem && (
          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
            <Package size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-700 truncate">{firstItem.title}</span>
            {firstItem.quantity && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 whitespace-nowrap">{firstItem.quantity} {firstItem.unit}</span>
              </>
            )}
            {items.length > 1 && (
              <span className="text-slate-400 text-xs whitespace-nowrap">+{items.length - 1}</span>
            )}
          </div>
        )}

        {/* Заказы */}
        {ordersSummary && (
          <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
            <FileText size={12} className="text-slate-400" />
            <span className="max-w-[100px] truncate">{ordersSummary}</span>
          </div>
        )}

        {/* Дата создания */}
        <div className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
          <Calendar size={12} />
          {formatDate(request.createdAt)}
        </div>

        {/* Статус */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color} text-white whitespace-nowrap`}>
          {statusInfo.label}
        </span>

        {/* Дедлайны и индикаторы */}
        <div className="flex items-center gap-1.5">
          {deadlineAlert && (
            <span className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 ${deadlineAlert.color} whitespace-nowrap`}>
              <AlertTriangle size={12} />
              {deadlineAlert.label}
            </span>
          )}
          {!deadlineAlert && hoursUntilDeadline !== null && hoursUntilDeadline >= 0 && (
            <span className="px-2 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <Clock size={12} />
              {hoursUntilDeadline} ч
            </span>
          )}
          {deliveryAlert && (
            <span className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 ${deliveryAlert.color} whitespace-nowrap`}>
              <Truck size={12} />
              {deliveryAlert.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
