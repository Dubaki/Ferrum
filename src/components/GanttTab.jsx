import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';

export default function GanttTab({ ganttItems, products, orders = [] }) {
  // Настройки отображения
  const dayWidth = 40; // ширина колонки дня в пикселях
  const daysToRender = 60; // сколько дней показывать вперед
  const [expandedOrders, setExpandedOrders] = useState([]);

  // Генерируем массив дат для шапки
  const startDate = new Date();
  startDate.setHours(0,0,0,0);
  startDate.setDate(startDate.getDate() - 3); // Показываем пару дней прошлого

  const calendarDays = Array.from({ length: daysToRender }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const toggleOrder = (orderId) => {
    setExpandedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  // Хелпер для расчета позиции и ширины полоски
  const getBarStyles = (start, end) => {
      if (!start || !end) return { left: 0, width: 0, display: 'none' };
      
      const startOffset = Math.ceil((new Date(start) - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1; // +1 чтобы захватить день конца
      
      return {
          left: `${startOffset * dayWidth}px`,
          width: `${Math.max(duration, 1) * dayWidth}px`
      };
  };

  // Хелпер для расчета "Фактической" полоски (примерная оценка)
  // Мы просто суммируем фактические часы и переводим их в дни (грубо / 8 часов)
  // Чтобы показать "сколько мы уже наработали" относительно старта.
  const getFactBarWidth = (product) => {
      const totalFactHours = product.operations.reduce((acc, op) => acc + ((op.actualMinutes || 0) * product.quantity), 0) / 60;
      if (totalFactHours === 0) return 0;
      
      // Допустим, 1 рабочий день = 8 часов.
      const daysWorked = totalFactHours / 8;
      return `${daysWorked * dayWidth}px`;
  };

  // Фильтруем активные заказы и сортируем
  const activeOrders = orders
    .filter(o => o.status === 'active')
    .sort((a,b) => (a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline) : 0));

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-[calc(100vh-140px)]">
      
      {/* 1. Верхняя панель (Легенда) */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="font-bold text-lg text-gray-700">График производства</h2>
          <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>План (Расчет по ресурсам)</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>Факт (Отработано)</span>
              </div>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          
          {/* 2. Левая колонка (Список заказов) */}
          <div className="w-1/3 md:w-1/4 border-r border-gray-200 overflow-y-auto bg-white z-10 shadow-lg">
              <div className="h-10 border-b border-gray-200 bg-gray-100 flex items-center px-4 font-bold text-xs text-gray-500 uppercase sticky top-0">
                  Заказ / Изделие
              </div>
              
              {activeOrders.map(order => {
                  const isExpanded = expandedOrders.includes(order.id);
                  const orderProducts = products.filter(p => p.orderId === order.id);

                  return (
                      <div key={order.id} className="border-b border-gray-100">
                          {/* Строка ЗАКАЗА */}
                          <div 
                            className="flex items-center gap-2 px-3 py-3 hover:bg-gray-50 cursor-pointer font-bold text-sm text-gray-800"
                            onClick={() => toggleOrder(order.id)}
                          >
                              {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                              <Folder size={16} className="text-gray-400" />
                              <div className="truncate flex-1">
                                  {order.orderNumber}
                                  <div className="text-[10px] text-gray-400 font-normal">{order.clientName}</div>
                              </div>
                          </div>

                          {/* Список ИЗДЕЛИЙ */}
                          {isExpanded && orderProducts.map(prod => (
                              <div key={prod.id} className="pl-10 pr-2 py-2 text-xs text-gray-600 border-t border-gray-50 hover:bg-blue-50 h-12 flex items-center">
                                  <span className="truncate">{prod.name}</span>
                                  <span className="ml-auto bg-gray-100 px-1 rounded text-[10px]">{prod.quantity} шт</span>
                              </div>
                          ))}
                          {isExpanded && orderProducts.length === 0 && (
                             <div className="pl-10 py-2 text-[10px] text-gray-400 italic">Нет изделий</div>
                          )}
                      </div>
                  );
              })}
          </div>

          {/* 3. Правая часть (Диаграмма Ганта) */}
          <div className="flex-1 overflow-auto relative bg-slate-50">
              
              {/* Сетка календаря (Фон) */}
              <div className="absolute top-0 bottom-0 left-0 flex h-full" style={{ width: `${daysToRender * dayWidth}px` }}>
                  {calendarDays.map((day, i) => {
                       const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                       return (
                           <div 
                             key={i} 
                             className={`h-full border-r border-gray-200 box-border flex-shrink-0 flex flex-col items-center justify-start pt-2 text-[10px] text-gray-400 ${isWeekend ? 'bg-gray-100/50' : ''}`}
                             style={{ width: `${dayWidth}px` }}
                           >
                               <span className="font-bold text-gray-600">{day.getDate()}</span>
                               <span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                           </div>
                       );
                  })}
              </div>

              {/* Полоски (Контент) */}
              <div className="absolute top-10 left-0 w-full">
                  {activeOrders.map(order => {
                      const isExpanded = expandedOrders.includes(order.id);
                      const orderProducts = products.filter(p => p.orderId === order.id);
                      
                      // Рендерим пустую строку высотой с заголовок заказа, чтобы выровнять сетку
                      // Можно добавить общую полоску заказа тут, если нужно
                      const orderRow = (
                          <div key={'row-'+order.id} className="h-[46px] w-full border-b border-transparent relative"> 
                              {/* Тут можно нарисовать сводную полоску заказа */}
                          </div>
                      );

                      if (!isExpanded) return orderRow;

                      return (
                          <React.Fragment key={order.id}>
                              {orderRow}
                              {orderProducts.map(prod => {
                                  const simItem = ganttItems.find(g => g.productId === prod.id);
                                  const planStyle = simItem ? getBarStyles(simItem.startDate, simItem.endDate) : { display: 'none' };
                                  const factWidth = getFactBarWidth(prod);

                                  return (
                                      <div key={prod.id} className="h-12 border-b border-gray-100/50 w-full relative group">
                                          {/* План (Синяя полоска) */}
                                          {simItem && (
                                              <div 
                                                className="absolute top-2 h-4 bg-blue-500 rounded-sm shadow-sm opacity-80 text-[9px] text-white flex items-center pl-1 whitespace-nowrap overflow-hidden z-10"
                                                style={planStyle}
                                                title={`План: ${simItem.startDate.toLocaleDateString()} - ${simItem.endDate.toLocaleDateString()}`}
                                              >
                                                  {simItem.durationDays} дн.
                                              </div>
                                          )}

                                          {/* Факт (Желтая полоска поверх или снизу) */}
                                          {factWidth !== 0 && planStyle.left && (
                                              <div 
                                                className="absolute top-6 h-2 bg-yellow-400 rounded-sm shadow-sm z-20 border border-yellow-500"
                                                style={{ left: planStyle.left, width: factWidth }}
                                                title="Фактически отработанное время"
                                              ></div>
                                          )}
                                      </div>
                                  );
                              })}
                          </React.Fragment>
                      );
                  })}
              </div>

          </div>
      </div>
    </div>
  );
}