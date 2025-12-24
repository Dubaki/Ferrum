import { memo, useMemo, useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, ArrowLeft, Calendar, BarChart3, ChevronDown, ChevronRight, ShoppingBag } from 'lucide-react';

// Карточка заказа в разделе отгрузок
const ShippingOrderCard = memo(function ShippingOrderCard({ order, products, onToggleToday, onCompleteShipping, onReturn, isAdmin }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const orderProducts = products.filter(p => p.orderId === order.id);
  const totalProducts = orderProducts.length;

  return (
    <div className={`
      bg-white rounded-xl border-2 transition-all duration-300
      ${order.shippingToday
        ? 'border-orange-400 shadow-lg shadow-orange-100'
        : 'border-slate-200 hover:border-slate-300'
      }
      ${isExpanded ? 'shadow-xl' : ''}
    `}>
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Иконка раскрытия */}
            <button className="p-1 rounded-full transition-colors shrink-0 text-slate-400">
              {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-slate-800">{order.orderNumber}</h3>
              </div>
              <p className="text-sm text-slate-500">{order.clientName}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span>{totalProducts} изд.</span>
                {order.deadline && (
                  <>
                    <span>•</span>
                    <span>Срок: {new Date(order.deadline).toLocaleDateString('ru-RU')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            {/* Галочка 1: Отгрузка сегодня */}
            {isAdmin && <button
              onClick={() => onToggleToday(order.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${order.shippingToday
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
              title="Отметить отгрузку на сегодня"
            >
              <Clock className="w-4 h-4" />
              Сегодня
            </button>}

            {/* Галочка 2: Отгружено */}
            {isAdmin && <button
              onClick={() => onCompleteShipping(order.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
              title="Отметить как отгружено"
            >
              <CheckCircle2 className="w-4 h-4" />
              Отгружено
            </button>}
          </div>
        </div>

        {/* Кнопка вернуть в заказы */}
        {isAdmin && <button
          onClick={(e) => {
            e.stopPropagation();
            onReturn(order.id);
          }}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Вернуть в заказы
        </button>}
      </div>

      {/* РАСКРЫВАЮЩАЯСЯ ЧАСТЬ - Список изделий */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShoppingBag size={14} />
            Состав заказа:
          </h4>

          {orderProducts.length > 0 ? (
            <div className="space-y-2">
              {orderProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ShoppingBag size={14} className="text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">
                      {product.name}
                    </span>
                    {product.isResale && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-cyan-600 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                        Товар
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-md shrink-0">
                    <span className="text-xs font-bold text-slate-500">x</span>
                    <span className="text-sm font-black text-slate-700">{product.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 text-sm">
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
            <div className="space-y-3 p-4 rounded-xl bg-slate-50">
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
