import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Folder, Calendar } from 'lucide-react';

export default function GanttTab({ ganttItems, products, orders = [] }) {
  // Настройки сетки
  const colWidth = 44; // ширина дня
  const sidebarWidth = 280; // ширина левой колонки
  const daysToRender = 60; // горизонт планирования

  const [expandedOrders, setExpandedOrders] = useState([]);

  // 1. Генерируем даты календаря
  const startDate = new Date();
  startDate.setHours(0,0,0,0);
  startDate.setDate(startDate.getDate() - 3); // Начинаем чуть раньше сегодня

  const calendarDays = Array.from({ length: daysToRender }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  // 2. Подготовка данных: Агрегируем время по Заказам
  const preparedOrders = useMemo(() => {
      const active = orders
        .filter(o => o.status === 'active')
        .sort((a,b) => (a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline) : 0));

      return active.map(order => {
          const orderProducts = products.filter(p => p.orderId === order.id);
          
          let minStart = null;
          let maxEnd = null;
          let totalRemainingMins = 0;
          let hasPlan = false; // Проверка, есть ли вообще план

          orderProducts.forEach(prod => {
              // Считаем остаток часов СТРОГО по каждой операции
              prod.operations.forEach(op => {
                  const plan = (op.minutesPerUnit || 0) * prod.quantity;
                  const fact = (op.actualMinutes || 0) * prod.quantity;
                  
                  if (plan > 0) hasPlan = true;
                  
                  // Если факт меньше плана, добавляем разницу в остаток
                  if (fact < plan) {
                      totalRemainingMins += (plan - fact);
                  }
              });

              // Ищем границы дат для отрисовки полоски
              const item = ganttItems.find(g => g.productId === prod.id);
              if (item) {
                  if (!minStart || item.startDate < minStart) minStart = item.startDate;
                  if (!maxEnd || item.endDate > maxEnd) maxEnd = item.endDate;
              }
          });

          // Если плана нет вообще (0 мин), считаем остаток 0, но это не "Готово", а "Нет плана"
          // Но для простоты: если remaining > 0, значит работа есть.
          
          const remainingHours = Math.ceil(totalRemainingMins / 60);

          return {
              ...order,
              products: orderProducts,
              ganttStart: minStart,
              ganttEnd: maxEnd,
              remainingHours: remainingHours,
              isFullyComplete: hasPlan && remainingHours <= 0,
              durationDays: minStart && maxEnd 
                ? Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1 
                : 0
          };
      });
  }, [orders, products, ganttItems]);

  const toggleOrder = (id) => {
    setExpandedOrders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Хелпер стиля полоски
  const getBarStyle = (start, end) => {
      if (!start || !end) return { display: 'none' };
      
      const startOffset = Math.ceil((new Date(start) - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
      
      if (startOffset + duration < 0) return { display: 'none' };

      const left = Math.max(0, startOffset * colWidth);
      const width = duration * colWidth;

      return {
          left: `${left}px`,
          width: `${width}px`
      };
  };

  // Позиция линии "Сегодня"
  const todayOffset = 3 * colWidth + (colWidth / 2);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-140px)] overflow-hidden fade-in relative">
      
      {/* Легенда */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-20">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-600" /> График производства
          </h2>
          <div className="flex gap-6 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                  <span>В работе</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                  <span>Готов к сдаче</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-red-500 border-l border-dashed border-red-500"></div>
                  <span>Сегодня</span>
              </div>
          </div>
      </div>

      {/* Скролл-контейнер */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
          
          <div className="inline-block min-w-full relative">
              
              {/* ШАПКА КАЛЕНДАРЯ */}
              <div className="flex sticky top-0 z-30 bg-slate-50 shadow-sm border-b border-slate-200 h-12">
                  <div 
                    className="sticky left-0 z-40 bg-slate-100 border-r border-slate-200 flex items-center px-4 font-bold text-xs text-slate-500 uppercase tracking-widest shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]"
                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                  >
                      Заказ / Изделие
                  </div>
                  
                  {calendarDays.map((day, i) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = i === 3; 
                      return (
                          <div 
                            key={i} 
                            className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-200/60 text-xs 
                                ${isToday ? 'bg-blue-50 text-blue-700' : isWeekend ? 'bg-rose-50/50 text-rose-400' : 'text-slate-600'}
                            `}
                            style={{ width: colWidth }}
                          >
                              <span className="font-bold">{day.getDate()}</span>
                              <span className="text-[9px] uppercase">{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                          </div>
                      );
                  })}
              </div>

              {/* ЛИНИЯ СЕГОДНЯ */}
              <div 
                className="absolute top-12 bottom-0 border-l-2 border-red-400 border-dashed z-10 pointer-events-none opacity-60"
                style={{ left: sidebarWidth + todayOffset }}
              ></div>

              {/* ТЕЛО ТАБЛИЦЫ */}
              <div className="relative z-0">
                  {preparedOrders.map(order => {
                      const isExpanded = expandedOrders.includes(order.id);
                      const barStyle = getBarStyle(order.ganttStart, order.ganttEnd);
                      
                      // Цвет полоски: Зеленый если готов, Индиго если в работе
                      const barColor = order.isFullyComplete ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600';

                      return (
                          <div key={order.id} className="group">
                              
                              {/* СТРОКА ЗАКАЗА */}
                              <div className="flex h-14 border-b border-slate-100 hover:bg-slate-50 transition-colors bg-white">
                                  
                                  <div 
                                    className="sticky left-0 z-20 flex items-center px-4 border-r border-slate-200 bg-white group-hover:bg-slate-50 transition-colors shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] cursor-pointer"
                                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                                    onClick={() => toggleOrder(order.id)}
                                  >
                                      <button className="mr-2 text-slate-400 hover:text-indigo-600 transition">
                                          {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                      </button>
                                      <Folder size={18} className={`mr-2 ${order.isFullyComplete ? 'text-emerald-500' : 'text-indigo-500'}`} />
                                      <div className="overflow-hidden">
                                          <div className="font-bold text-slate-800 text-sm truncate">{order.orderNumber}</div>
                                          <div className="text-[10px] text-slate-400 truncate">{order.clientName}</div>
                                      </div>
                                  </div>

                                  <div className="flex-1 relative">
                                      <div className="absolute inset-0 flex h-full pointer-events-none">
                                          {calendarDays.map((d, i) => (
                                              <div 
                                                key={i} 
                                                className={`h-full border-r border-slate-100 flex-shrink-0 ${(d.getDay()===0||d.getDay()===6) ? 'bg-rose-50/20' : ''}`}
                                                style={{ width: colWidth }}
                                              ></div>
                                          ))}
                                      </div>

                                      {/* ПОЛОСКА ЗАКАЗА */}
                                      <div className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-md transition-colors z-10 flex items-center px-2 overflow-hidden cursor-help group/bar ${barColor}`}
                                           style={barStyle}
                                           title={`Осталось работы: ${order.remainingHours} ч\nКалендарный срок: ${order.durationDays} дн.\nФиниш: ${order.ganttEnd?.toLocaleDateString()}`}
                                      >
                                          <span className="text-white text-xs font-bold whitespace-nowrap drop-shadow-md flex items-center gap-1">
                                              {order.isFullyComplete 
                                                ? '✅ Готов' 
                                                : `⏳ ${order.remainingHours} ч.`
                                              }
                                          </span>
                                      </div>
                                  </div>
                              </div>

                              {/* СПИСОК ИЗДЕЛИЙ */}
                              {isExpanded && order.products.map(prod => (
                                  <div key={prod.id} className="flex h-10 border-b border-slate-50 bg-slate-50/30 hover:bg-slate-100/50 transition-colors">
                                      <div 
                                        className="sticky left-0 z-10 flex items-center pl-12 pr-4 border-r border-slate-200/50 text-xs text-slate-600 bg-slate-50/30"
                                        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                                      >
                                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mr-3"></div>
                                          <span className="truncate flex-1">{prod.name}</span>
                                          <span className="text-slate-400 ml-2">{prod.quantity}шт</span>
                                      </div>
                                      
                                      <div className="flex-1 flex">
                                          {calendarDays.map((d, i) => (
                                              <div 
                                                key={i} 
                                                className={`h-full border-r border-slate-100/50 flex-shrink-0 ${(d.getDay()===0||d.getDay()===6) ? 'bg-rose-50/20' : ''}`}
                                                style={{ width: colWidth }}
                                              ></div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      );
                  })}
                  
                  {preparedOrders.length === 0 && (
                      <div className="p-10 text-center text-slate-400">
                          Нет активных заказов для отображения на графике.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}