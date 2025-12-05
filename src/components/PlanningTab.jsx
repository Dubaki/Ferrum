import React, { useState } from 'react';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, ArrowDownCircle, 
  Package, FolderOpen, User, X, CheckCircle, RotateCcw, Calendar
} from 'lucide-react';
import { STANDARD_OPERATIONS } from '../utils/constants';

export default function PlanningTab({ products, resources, actions, ganttItems = [], orders = [] }) {
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [expandedProductIds, setExpandedProductIds] = useState([]); 
  const [showHistory, setShowHistory] = useState(false);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);

  // --- ХЕЛПЕРЫ ---
  const toggleOrder = (id) => {
      setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleChevronClick = (e, id) => {
      e.stopPropagation();
      toggleOrder(id);
  };

  const toggleProduct = (id, e) => {
      e.stopPropagation();
      setExpandedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isStandard = (name) => STANDARD_OPERATIONS.includes(name);

  // --- ЯРКАЯ ГРАДАЦИЯ ЦВЕТОВ ---
  const getOrderStyle = (deadlineStr) => {
      if (!deadlineStr) return 'bg-white border-gray-200';
      const today = new Date();
      today.setHours(0,0,0,0);
      const deadline = new Date(deadlineStr);
      deadline.setHours(0,0,0,0);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) return 'bg-red-200 border-red-500 ring-1 ring-red-400';
      if (diffDays <= 7) return 'bg-orange-200 border-orange-400 ring-1 ring-orange-300';
      if (diffDays <= 10) return 'bg-blue-200 border-blue-400 ring-1 ring-blue-300';
      return 'bg-green-100 border-green-400 ring-1 ring-green-300';
  };

  const getDeadlineLabel = (deadlineStr) => {
      if (!deadlineStr) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const deadline = new Date(deadlineStr);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return <span className="text-red-700 font-black uppercase text-[10px]">Просрочено {Math.abs(diffDays)} дн!</span>
      if (diffDays === 0) return <span className="text-red-700 font-black uppercase text-[10px]">СЕГОДНЯ!</span>
      if (diffDays <= 3) return <span className="text-red-700 font-bold text-[10px]">Осталось: {diffDays} дн.</span>
      return null;
  };

  const getHistorySuggestion = (opName) => {
    if (!opName) return null;
    let totalMins = 0;
    let count = 0;
    products.filter(p => p.status === 'completed').forEach(p => { // Это можно оптимизировать, если продукты имеют флаг
       // Пока ищем среди всех, или можно передавать завершенные отдельно
       // Для упрощения ищем по всем, у которых есть фактическое время
       if (p.operations) {
            p.operations.forEach(op => {
                if (op.name.toLowerCase() === opName.toLowerCase() && op.actualMinutes > 0) {
                    totalMins += op.actualMinutes;
                    count++;
                }
            });
       }
    });
    return count > 0 ? Math.round(totalMins / count) : null;
  };

  // --- СОРТИРОВКА И ГРУППИРОВКА ---
  const activeOrders = orders
    .filter(o => o.status === 'active')
    .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; 
        if (!b.deadline) return -1; 
        return new Date(a.deadline) - new Date(b.deadline); 
    });

  const orphanProducts = products.filter(p => !p.orderId);

  // --- ЛОГИКА ИСТОРИИ (ГРУППИРОВКА ПО МЕСЯЦАМ) ---
  const renderHistory = () => {
    const completedOrders = orders
        .filter(o => o.status === 'completed')
        .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0)); // Свежие сверху

    const groupedByMonth = {};
    completedOrders.forEach(order => {
        const date = order.finishedAt ? new Date(order.finishedAt) : new Date(order.createdAt);
        const key = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[key]) groupedByMonth[key] = [];
        groupedByMonth[key].push(order);
    });

    return (
        <div className="space-y-8 animate-in fade-in">
            {Object.keys(groupedByMonth).map(monthKey => {
                const monthOrders = groupedByMonth[monthKey];
                
                // Статистика за месяц
                const totalMonthOrders = monthOrders.length;
                let totalMonthFactHours = 0;
                monthOrders.forEach(o => {
                    const oProducts = products.filter(p => p.orderId === o.id);
                    oProducts.forEach(p => {
                        p.operations.forEach(op => {
                            totalMonthFactHours += (op.actualMinutes || 0) * p.quantity;
                        });
                    });
                });

                return (
                    <div key={monthKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {/* Заголовок месяца */}
                        <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-700 capitalize flex items-center gap-2">
                                <Calendar size={20} />
                                {monthKey}
                            </h3>
                            <div className="text-right text-xs text-gray-500">
                                <div>Заказов сдано: <span className="font-bold text-gray-800">{totalMonthOrders}</span></div>
                                <div>Трудозатраты: <span className="font-bold text-gray-800">{(totalMonthFactHours/60).toFixed(1)} ч</span></div>
                            </div>
                        </div>

                        {/* Список заказов месяца */}
                        <div className="divide-y divide-gray-100">
                            {monthOrders.map(order => {
                                const oProducts = products.filter(p => p.orderId === order.id);
                                let orderFactHours = 0;
                                oProducts.forEach(p => p.operations.forEach(op => orderFactHours += (op.actualMinutes || 0) * p.quantity));

                                return (
                                    <div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <div className="font-bold text-gray-800">{order.orderNumber || 'Без номера'}</div>
                                            <div className="text-sm text-gray-500">{order.clientName}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Сдан: {new Date(order.finishedAt).toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-600">{(orderFactHours/60).toFixed(1)} ч</div>
                                                <div className="text-xs text-gray-400">Факт</div>
                                            </div>
                                            <button 
                                                onClick={() => actions.restoreOrder(order.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded tooltip"
                                                title="Вернуть в работу"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {completedOrders.length === 0 && (
                <div className="text-center py-10 text-gray-400">История пуста. Завершите первый заказ!</div>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
         <div className="flex gap-4 items-center">
             <h2 className="text-2xl font-bold text-gray-800">
                 {showHistory ? 'История завершенных' : 'Портфель заказов'}
             </h2>
             <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`text-sm font-medium px-3 py-1 rounded transition ${showHistory ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
             >
               {showHistory ? 'Вернуться к активным' : 'Архив / История'}
             </button>
         </div>
         {!showHistory && (
            <button onClick={actions.addOrder} className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700 shadow-lg font-medium transition">
                <Plus size={18} /> Создать новый заказ
            </button>
         )}
      </div>

      {/* --- РЕЖИМ ИСТОРИИ --- */}
      {showHistory ? renderHistory() : (
        <div className="space-y-6">
        {/* --- РЕЖИМ АКТИВНЫХ ЗАКАЗОВ --- */}
        {activeOrders.map(order => {
            const isOrderExpanded = expandedOrderIds.includes(order.id);
            const orderPositions = products.filter(p => p.orderId === order.id);
            
            const totalOrderHours = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + (op.minutesPerUnit * p.quantity), 0), 0) / 60;
            const doneOrderHours = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + ((op.actualMinutes || 0) * p.quantity), 0), 0) / 60;
            const progress = totalOrderHours > 0 ? Math.round((doneOrderHours / totalOrderHours) * 100) : 0;

            const cardStyle = getOrderStyle(order.deadline); 

            return (
                <div key={order.id} className={`rounded-xl shadow-md border transition-all hover:shadow-lg ${cardStyle}`}>
                    
                    {/* ШАПКА ЗАКАЗА */}
                    <div 
                        className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 cursor-pointer relative"
                        onClick={() => toggleOrder(order.id)}
                    >
                        <div className="absolute right-3 top-3 md:static md:block z-10">
                             <button 
                                onClick={(e) => handleChevronClick(e, order.id)}
                                className="p-2 bg-white/50 rounded-full hover:bg-white transition shadow-sm md:shadow-none md:bg-transparent"
                             >
                                 {isOrderExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                             </button>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center pr-10 md:pr-0">
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={order.orderNumber}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => actions.updateOrder(order.id, 'orderNumber', e.target.value)}
                                        className="font-bold text-lg bg-transparent border-b border-transparent focus:border-black/20 outline-none w-full placeholder-gray-600 text-gray-900 py-1"
                                        placeholder="№ Договора..."
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs opacity-90">
                                    <User size={14} className="text-gray-700 flex-shrink-0" />
                                    <input 
                                        type="text" 
                                        value={order.clientName}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => actions.updateOrder(order.id, 'clientName', e.target.value)}
                                        className="bg-transparent border-b border-transparent focus:border-black/20 outline-none w-full md:w-64 text-gray-800 font-medium py-1 placeholder-gray-500"
                                        placeholder="Имя клиента..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between md:justify-end items-center gap-4 mt-2 md:mt-0">
                                <div className="text-right flex-1 md:flex-none">
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Дэдлайн</div>
                                        {getDeadlineLabel(order.deadline)}
                                    </div>
                                    <input 
                                        type="date" 
                                        value={order.deadline}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => actions.updateOrder(order.id, 'deadline', e.target.value)}
                                        className={`w-full md:w-auto bg-transparent text-sm font-bold border-b border-transparent focus:border-black/20 outline-none text-right cursor-pointer text-gray-900 ${!order.deadline && 'text-red-600 opacity-60'}`}
                                    />
                                </div>
                                
                                <div className="text-right min-w-[50px]">
                                    <div className="text-xl md:text-2xl font-bold leading-none text-gray-800">{progress}%</div>
                                    <div className="text-[10px] uppercase text-gray-600">Готовность</div>
                                </div>

                                {/* КНОПКИ ДЕЙСТВИЙ */}
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button 
                                        onClick={() => actions.finishOrder(order.id)}
                                        className="p-2 bg-green-500 text-white rounded shadow-sm hover:bg-green-600 transition"
                                        title="Завершить заказ"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button 
                                        onClick={() => actions.deleteOrder(order.id)}
                                        className="p-2 hover:bg-white/40 rounded text-red-600/70 hover:text-red-700 transition"
                                        title="Удалить"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ТЕЛО ЗАКАЗА */}
                    {isOrderExpanded && (
                        <div className="bg-white/60 p-2 md:p-4 border-t border-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                            
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2 tracking-wider">
                                    <FolderOpen size={14} />
                                    Состав заказа ({orderPositions.length})
                                </div>
                                <button 
                                    onClick={() => actions.addProduct(order.id)}
                                    className="text-sm flex items-center gap-1 text-blue-700 font-bold hover:bg-blue-100 px-3 py-1.5 rounded transition"
                                >
                                    <Plus size={16} /> <span className="hidden md:inline">Добавить изделие</span><span className="md:hidden">Изделие</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {orderPositions.map(product => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product}
                                        isExpanded={expandedProductIds.includes(product.id)}
                                        onToggle={(e) => toggleProduct(product.id, e)}
                                        actions={actions}
                                        resources={resources}
                                        isStandard={isStandard}
                                        ganttItem={ganttItems.find(g => g.productId === product.id)}
                                        getHistorySuggestion={getHistorySuggestion} // Просто функция, не хук
                                        sortedResources={resources.sort((a,b) => a.name.localeCompare(b.name))}
                                        openExecutorDropdown={openExecutorDropdown}
                                        setOpenExecutorDropdown={setOpenExecutorDropdown}
                                    />
                                ))}
                                {orderPositions.length === 0 && (
                                    <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                                        В этом заказе пока нет изделий.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
        {activeOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                Нет активных заказов. Создайте новый!
            </div>
        )}
        </div>
      )}

      {/* --- НЕРАСПРЕДЕЛЕННЫЕ --- */}
      {!showHistory && orphanProducts.length > 0 && (
          <div className="mt-12 pt-8 border-t-2 border-gray-200 border-dashed">
              <h3 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                  <Package size={20} /> Нераспределенные изделия (Без папки)
              </h3>
              <div className="space-y-3">
                  {orphanProducts.map(product => (
                      <ProductCard 
                          key={product.id} 
                          product={product}
                          isExpanded={expandedProductIds.includes(product.id)}
                          onToggle={(e) => toggleProduct(product.id, e)}
                          actions={actions}
                          resources={resources}
                          isStandard={isStandard}
                          ganttItem={ganttItems.find(g => g.productId === product.id)}
                          getHistorySuggestion={() => null} // Не нужно в архивных
                          sortedResources={resources}
                          openExecutorDropdown={openExecutorDropdown}
                          setOpenExecutorDropdown={setOpenExecutorDropdown}
                      />
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}

// --- КОМПОНЕНТ КАРТОЧКИ ИЗДЕЛИЯ ---
function ProductCard({ 
    product, isExpanded, onToggle, actions, resources, isStandard, 
    ganttItem, getHistorySuggestion, sortedResources, 
    openExecutorDropdown, setOpenExecutorDropdown 
}) {
    const totalPlan = product.operations.reduce((acc, op) => acc + (op.minutesPerUnit * product.quantity), 0);
    const totalFact = product.operations.reduce((acc, op) => acc + ((op.actualMinutes || 0) * product.quantity), 0);
    const factColor = totalFact > totalPlan ? 'text-red-500' : 'text-green-600';

    return (
        <div className={`bg-white border rounded-lg transition-all ${isExpanded ? 'shadow-md border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}`}>
             
             {/* Сводная строка */}
             <div className="flex flex-col md:flex-row md:items-center p-3 md:p-4 cursor-pointer relative group gap-2 md:gap-0" onClick={onToggle}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${totalFact >= totalPlan && totalPlan > 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                
                <div className="absolute right-3 top-3 md:static md:block text-gray-400">
                    {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center pl-3 md:pl-0 pr-8 md:pr-0">
                    <div className="md:col-span-5">
                        <div className="font-bold text-gray-800 text-base md:text-lg">{product.name}</div>
                        <div className="text-xs text-gray-500 flex gap-3 mt-1">
                             <span>Кол-во: <span className="font-bold text-gray-900">{product.quantity} шт.</span></span>
                             {product.startDate && <span>Старт: {product.startDate}</span>}
                        </div>
                    </div>

                    <div className="md:col-span-3 flex gap-4 text-sm bg-gray-50 md:bg-transparent p-2 md:p-0 rounded">
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase">План</span>
                            <span className="font-semibold">{(totalPlan / 60).toFixed(1)} ч</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Факт</span>
                            <span className={`font-bold ${factColor}`}>{(totalFact / 60).toFixed(1)} ч</span>
                        </div>
                    </div>

                    <div className="md:col-span-3 text-xs text-gray-400 hidden md:block">
                        {ganttItem ? (
                            <div>Расчет: {ganttItem.startDate.toLocaleDateString()} - {ganttItem.endDate.toLocaleDateString()}</div>
                        ) : <span>Нет операций</span>}
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                        <button 
                            onClick={(e) => { e.stopPropagation(); actions.deleteProduct(product.id); }}
                            className="text-gray-300 hover:text-red-500 p-2 z-10"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
             </div>

             {/* Развернутое тело */}
             {isExpanded && (
                 <div className="border-t border-gray-100 bg-gray-50/50 p-2 md:p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input 
                            type="text" value={product.name}
                            onChange={e => actions.updateProduct(product.id, 'name', e.target.value)}
                            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm font-medium focus:border-blue-400 outline-none"
                            placeholder="Название изделия..."
                        />
                         <div className="flex gap-2">
                             <input 
                                type="number" value={product.quantity}
                                onChange={e => actions.updateProduct(product.id, 'quantity', parseInt(e.target.value))}
                                className="w-20 border border-gray-200 rounded px-2 py-2 text-center text-sm font-bold"
                                placeholder="Кол-во"
                            />
                             <input 
                                type="date" value={product.startDate}
                                onChange={e => actions.updateProduct(product.id, 'startDate', e.target.value)}
                                className="border border-gray-200 rounded px-3 py-2 text-sm"
                            />
                         </div>
                    </div>

                    <div className="bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-12 gap-1 md:gap-2 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-2 uppercase tracking-wide rounded-t">
                            <div className="col-span-1 text-center">№</div>
                            <div className="col-span-5 md:col-span-4">Операция</div>
                            <div className="hidden md:block md:col-span-3">Исполнитель</div>
                            <div className="col-span-3 md:col-span-2 text-center">План</div>
                            <div className="col-span-3 md:col-span-2 text-center text-yellow-600">Факт</div>
                        </div>

                        {product.operations.map((op) => {
                            const isDropdownOpen = openExecutorDropdown === op.id;
                            const historySuggestion = getHistorySuggestion && getHistorySuggestion(op.name);

                            return (
                                <div key={op.id} className="grid grid-cols-12 gap-1 md:gap-2 items-center px-2 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 relative">
                                    <div className="col-span-1 text-center font-bold text-gray-300">{op.sequence}</div>
                                    
                                    <div className="col-span-5 md:col-span-4">
                                        <select 
                                            value={isStandard(op.name) ? op.name : 'other'}
                                            onChange={(e) => actions.updateOperation(product.id, op.id, 'name', e.target.value === 'other' ? 'Новая' : e.target.value)}
                                            className="w-full text-sm bg-transparent font-medium outline-none text-gray-700"
                                        >
                                            {STANDARD_OPERATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="other">Свой вариант...</option>
                                        </select>
                                        {!isStandard(op.name) && (
                                            <input 
                                                type="text" value={op.name}
                                                onChange={e => actions.updateOperation(product.id, op.id, 'name', e.target.value)}
                                                className="w-full text-xs border-b border-blue-300 outline-none text-blue-800 mt-1"
                                                placeholder="Введите название..."
                                            />
                                        )}
                                        {historySuggestion && historySuggestion !== op.minutesPerUnit && (
                                            <button 
                                                onClick={() => actions.updateOperation(product.id, op.id, 'minutesPerUnit', historySuggestion)}
                                                className="mt-1 flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded hover:bg-green-100 transition w-fit"
                                            >
                                                <ArrowDownCircle size={10} /> {historySuggestion} мин
                                            </button>
                                        )}
                                        
                                        <div className="md:hidden mt-1 relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenExecutorDropdown(isDropdownOpen ? null : op.id); }}
                                                className="text-[10px] text-blue-600 underline font-medium"
                                            >
                                                {op.resourceIds?.length > 0 ? 'Исп: ' + op.resourceIds.length : 'Выбрать...'}
                                            </button>
                                            
                                            {isDropdownOpen && (
                                                <div className="absolute top-full left-0 z-50 w-48 bg-white shadow-xl border border-gray-200 rounded p-2 max-h-48 overflow-y-auto mt-1">
                                                     <div className="flex justify-between items-center mb-1 pb-1 border-b">
                                                         <span className="text-xs font-bold text-gray-600">Исполнители</span>
                                                         <X size={14} onClick={(e) => {e.stopPropagation(); setOpenExecutorDropdown(null)}} className="text-gray-400"/>
                                                     </div>
                                                     {sortedResources.map(res => (
                                                        <label key={res.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0" onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={op.resourceIds?.includes(res.id)}
                                                                onChange={() => actions.toggleResourceForOp(product.id, op.id, res.id)}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-gray-700">{res.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden md:block md:col-span-3 relative">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenExecutorDropdown(isDropdownOpen ? null : op.id); }}
                                            className="w-full text-left text-xs px-2 py-1 rounded border border-gray-200 truncate hover:border-blue-400 bg-white"
                                        >
                                            {op.resourceIds?.length > 0 
                                                ? sortedResources.filter(r => op.resourceIds.includes(r.id)).map(r => r.name).join(', ') 
                                                : <span className="text-gray-400">Выбрать...</span>
                                            }
                                        </button>
                                        
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 z-[100] w-64 bg-white shadow-2xl border border-gray-200 rounded-lg p-2 max-h-64 overflow-y-auto mt-1">
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                                     <span className="text-xs font-bold text-gray-500">Отметьте сотрудников</span>
                                                     <X size={14} onClick={(e) => {e.stopPropagation(); setOpenExecutorDropdown(null)}} className="cursor-pointer hover:text-red-500"/>
                                                </div>
                                                {sortedResources.map(res => (
                                                    <label key={res.id} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 cursor-pointer rounded" onClick={e => e.stopPropagation()}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={op.resourceIds?.includes(res.id)}
                                                            onChange={() => actions.toggleResourceForOp(product.id, op.id, res.id)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-700 font-medium">{res.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {isDropdownOpen && <div className="fixed inset-0 z-[90]" onClick={(e) => {e.stopPropagation(); setOpenExecutorDropdown(null)}}></div>}
                                    </div>

                                    <div className="col-span-3 md:col-span-2 text-center">
                                        <input 
                                            type="number" value={op.minutesPerUnit}
                                            onChange={e => actions.updateOperation(product.id, op.id, 'minutesPerUnit', parseFloat(e.target.value))}
                                            className="w-full md:w-16 text-center text-sm font-bold bg-gray-50 border border-transparent rounded focus:outline-none focus:border-blue-400"
                                        />
                                    </div>

                                    <div className="col-span-3 md:col-span-2 text-center relative flex justify-center items-center gap-1">
                                        <input 
                                            type="number" value={op.actualMinutes || 0}
                                            onChange={e => actions.updateOperation(product.id, op.id, 'actualMinutes', parseFloat(e.target.value))}
                                            className="w-full md:w-16 text-center text-sm font-bold bg-yellow-50 border border-yellow-100 text-gray-800 rounded focus:outline-none focus:border-yellow-400"
                                        />
                                        
                                        <button 
                                            onClick={() => actions.deleteOperation(product.id, op.id)} 
                                            className="text-gray-400 hover:text-red-600 p-1 md:absolute md:-right-8"
                                            title="Удалить операцию"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        <button 
                            onClick={() => actions.addOperation(product.id)}
                            className="w-full py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1"
                        >
                            <Plus size={14} /> Добавить операцию
                        </button>
                    </div>
                 </div>
             )}
        </div>
    );
}