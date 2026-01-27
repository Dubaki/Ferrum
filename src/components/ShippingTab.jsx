import { memo, useMemo, useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, ArrowLeft, Calendar, BarChart3, ChevronDown, ChevronRight, ShoppingBag } from 'lucide-react';

// =================================================================================
// ЭЛИТНАЯ КАРТОЧКА ЗАКАЗА (ВЕРСИЯ 5 - КЛИК НА ВСЮ КАРТОЧКУ)
// =================================================================================
const ShippingOrderCard = memo(function ShippingOrderCard({ order, products, onToggleToday, onCompleteShipping, onReturn, isAdmin }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const orderProducts = products.filter(p => p.orderId === order.id);
  const totalProducts = orderProducts.length;

  // Функции с подтверждением
  const handleToggleToday = (e) => {
    e.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите ${order.shippingToday ? 'снять отметку' : 'отметить'} "Отгрузка сегодня" для заказа ${order.orderNumber}?`)) {
      onToggleToday(order.id);
    }
  };

  const handleCompleteShipping = (e) => {
    e.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите отметить заказ ${order.orderNumber} как отгруженный? Это действие переместит заказ в архив.`)) {
      onCompleteShipping(order.id);
    }
  };

  const handleReturn = (e) => {
    e.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите вернуть заказ ${order.orderNumber} обратно в работу?`)) {
      onReturn(order.id);
    }
  };

  const todayClass = order.shippingToday ? 'border-l-4 border-orange-500' : 'border-l-4 border-transparent';

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 border border-slate-200 ${todayClass}`}>
      {/* --- СВЕРНУТАЯ ЧАСТЬ - КЛИКАБЕЛЬНАЯ --- */}
      <div className="flex items-center justify-between gap-4 p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>

        {/* 1. Основная инфа */}
        <div className="flex items-baseline gap-3 flex-grow min-w-0">
          <h3 className="font-bold text-gray-800 text-base whitespace-nowrap">{order.orderNumber}</h3>
          <p className="text-sm text-gray-500 truncate">{order.clientName}</p>
        </div>

        {/* 2. Второстепенная инфа (скрывается на мобилке) */}
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5"><ShoppingBag size={14}/> {totalProducts}</span>
          {order.deadline && (
            <span className="flex items-center gap-1.5"><Calendar size={14}/> {new Date(order.deadline).toLocaleDateString('ru-RU')}</span>
          )}
        </div>

        {/* 3. Кнопки действий */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleReturn}
              className="p-2 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Вернуть в заказы"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleToday}
              className={`flex items-center justify-center gap-1.5 w-28 text-xs font-semibold px-2 py-1.5 rounded-md transition-all ${ 
                order.shippingToday
                  ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Сегодня</span>
            </button>
            <button
              onClick={handleCompleteShipping}
              className="flex items-center justify-center gap-1.5 w-28 text-xs font-semibold px-2 py-1.5 rounded-md bg-white text-emerald-600 border border-emerald-300 hover:bg-emerald-50 transition-all"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Отгружено</span>
            </button>
          </div>
        )}
      </div>

      {/* --- РАСКРЫВАЮЩАЯСЯ ЧАСТЬ --- */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 animate-in slide-in-from-top-1">
          {/* Информация, которая была скрыта на мобилке */}
          <div className="md:hidden flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1.5"><ShoppingBag size={14}/> {totalProducts} изд.</span>
            {order.deadline && (
              <span className="flex items-center gap-1.5"><Calendar size={14}/> Срок: {new Date(order.deadline).toLocaleDateString('ru-RU')}</span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <ShoppingBag size={16} />
            Состав заказа:
          </h4>
          {orderProducts.length > 0 ? (
            <div className="space-y-2">
              {orderProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-slate-800 truncate">
                      {product.name}
                    </span>
                    {product.isResale && (
                      <span className="text-xs font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full shrink-0">
                        Товар
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-slate-800 shrink-0">
                    {product.quantity} <span className="text-sm font-medium text-slate-500">шт.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-slate-500">
              Нет изделий в заказе
            </div>
          )}
        </div>
      )}
    </div>
  );
});


// Статистика за месяц
const MonthlyStats = memo(function MonthlyStats({ orders, selectedMonth, onMonthChange }) {
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      });
    }
    return result;
  }, []);

  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const shippedThisMonth = orders.filter(o => {
      if (!o.shippedAt) return false;
      const shippedDate = new Date(o.shippedAt);
      return shippedDate >= startOfMonth && shippedDate <= endOfMonth;
    });

    return {
      total: shippedThisMonth.length,
      orders: shippedThisMonth.sort((a, b) => new Date(b.shippedAt) - new Date(a.shippedAt))
    };
  }, [orders, selectedMonth]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">Статистика отгрузок</h3>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="bg-emerald-50 rounded-lg px-4 py-3 flex-1">
          <div className="text-3xl font-black text-emerald-600">{stats.total}</div>
          <div className="text-xs text-emerald-600/70 font-medium">Отгружено за месяц</div>
        </div>
      </div>

      {stats.orders.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-medium text-slate-500 mb-2">Последние отгрузки:</div>
          {stats.orders.map(order => (
            <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <div className="font-medium text-slate-700 text-sm">{order.orderNumber}</div>
                <div className="text-xs text-slate-400">{order.clientName}</div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(order.shippedAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.orders.length === 0 && (
        <div className="text-center py-4 text-slate-400 text-sm">
          Нет отгрузок за выбранный месяц
        </div>
      )}
    </div>
  );
});

export default memo(function ShippingTab({ orders, products, actions, isAdmin }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Заказы в отгрузках (на складе)
  const shippingOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'active' && o.inShipping)
      .sort((a, b) => {
        // Сначала те что отгружаются сегодня
        if (a.shippingToday && !b.shippingToday) return -1;
        if (!a.shippingToday && b.shippingToday) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [orders]);

  // Есть ли заказы на сегодня - для пульсации
  const hasShippingToday = shippingOrders.some(o => o.shippingToday);

  return (
    <div className="space-y-6">
      {/* Заголовок раздела */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-700 to-slate-800">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-slate-300" />
          <div>
            <h1 className="text-2xl font-black text-white">Отгрузки</h1>
            <p className="text-sm text-slate-400">
              {shippingOrders.length > 0
                ? `${shippingOrders.length} заказов на складе`
                : 'Нет заказов на складе'
              }
              {hasShippingToday && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500 rounded-full text-white font-bold text-xs">
                  Отгрузка сегодня!
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список заказов на складе */}
        <div className="lg:col-span-2 space-y-4">
          {shippingOrders.length > 0 ? (
            <div className="space-y-3 p-4 rounded-xl bg-slate-100">
              {shippingOrders.map(order => (
                <ShippingOrderCard
                  key={order.id}
                  order={order}
                  products={products}
                  onToggleToday={actions.toggleShippingToday}
                  onCompleteShipping={actions.completeShipping}
                  onReturn={actions.returnFromShipping}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400 mb-2">Склад пуст</h3>
              <p className="text-sm text-slate-400">
                Переместите готовые заказы сюда из раздела "Заказы"
              </p>
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="space-y-4">
          <MonthlyStats
            orders={orders}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>
    </div>
  );
});
