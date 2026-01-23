import { useMemo } from 'react';
import { FileText, Calendar, Package, Check, Truck, CreditCard, Clock, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SUPPLY_STATUSES, canPerformAction } from '../../utils/supplyRoles';

export default function SupplyRequestCard({ request, userRole, supplyActions, onOpenDetails, onOpenDeliveryModal }) {
  const statusInfo = SUPPLY_STATUSES[request.status] || SUPPLY_STATUSES.new;

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

  // Определение доступных действий
  const canRequestInvoice = canPerformAction(userRole, 'requestInvoice') && request.status === 'new';
  const canSubmitForApproval = canPerformAction(userRole, 'submitForApproval') && request.status === 'invoice_requested';
  const canApproveTechnologist = canPerformAction(userRole, 'approveTechnologist') && request.status === 'pending_tech_approval';
  const canApproveShopManager = canPerformAction(userRole, 'approveShopManager') && request.status === 'pending_management' && !request.approvals?.shopManager;
  const canApproveDirector = canPerformAction(userRole, 'approveDirector') && request.status === 'pending_management' && !request.approvals?.director;
  const canMarkPaid = canPerformAction(userRole, 'markPaid') && request.status === 'pending_payment';
  const canSetDelivery = canPerformAction(userRole, 'setDeliveryDate') && request.status === 'paid';
  const canMarkDelivered = canPerformAction(userRole, 'markDelivered') && request.status === 'awaiting_delivery';

  const hasAction = canRequestInvoice || canSubmitForApproval || canApproveTechnologist ||
    canApproveShopManager || canApproveDirector || canMarkPaid || canSetDelivery || canMarkDelivered;

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
      className={`bg-white rounded-lg border transition hover:shadow-md cursor-pointer ${
        deliveryAlert ? 'border-orange-300' : 'border-slate-200'
      }`}
      onClick={onOpenDetails}
    >
      <div className="p-4">
        {/* Верхняя строка: номер, статус, дата */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-slate-800">{request.requestNumber}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color} text-white`}>
              {statusInfo.label}
            </span>
            {deliveryAlert && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${deliveryAlert.color}`}>
                <AlertTriangle size={12} />
                {deliveryAlert.label}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Clock size={12} />
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

        {/* Прогресс согласования для статуса pending_management */}
        {request.status === 'pending_management' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Согласование:</span>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs ${request.approvals?.shopManager ? 'text-emerald-600' : 'text-slate-400'}`}>
                {request.approvals?.shopManager ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                Нач. цеха
              </span>
              <span className={`flex items-center gap-1 text-xs ${request.approvals?.director ? 'text-emerald-600' : 'text-slate-400'}`}>
                {request.approvals?.director ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                Директор
              </span>
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        {hasAction && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            {canRequestInvoice && (
              <button
                onClick={() => supplyActions.requestInvoice(request.id)}
                className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 transition flex items-center gap-1"
              >
                <FileText size={14} />
                Запросить счёт
              </button>
            )}
            {canSubmitForApproval && (
              <button
                onClick={() => supplyActions.submitForApproval(request.id)}
                className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition flex items-center gap-1"
              >
                <ChevronRight size={14} />
                На согласование
              </button>
            )}
            {canApproveTechnologist && (
              <button
                onClick={() => supplyActions.approveTechnologist(request.id)}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-1"
              >
                <Check size={14} />
                Согласовать
              </button>
            )}
            {canApproveShopManager && (
              <button
                onClick={() => supplyActions.approveShopManager(request.id)}
                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition flex items-center gap-1"
              >
                <Check size={14} />
                Согласовать (Нач. цеха)
              </button>
            )}
            {canApproveDirector && (
              <button
                onClick={() => supplyActions.approveDirector(request.id)}
                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition flex items-center gap-1"
              >
                <Check size={14} />
                Согласовать (Директор)
              </button>
            )}
            {canMarkPaid && (
              <button
                onClick={() => supplyActions.markPaid(request.id)}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-1"
              >
                <CreditCard size={14} />
                Оплачено
              </button>
            )}
            {canSetDelivery && (
              <button
                onClick={onOpenDeliveryModal}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded text-sm font-medium hover:bg-cyan-600 transition flex items-center gap-1"
              >
                <Calendar size={14} />
                Указать срок доставки
              </button>
            )}
            {canMarkDelivered && (
              <button
                onClick={() => supplyActions.markDelivered(request.id)}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
              >
                <Truck size={14} />
                Доставлено
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
