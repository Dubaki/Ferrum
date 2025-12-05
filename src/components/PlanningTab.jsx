import React, { useState } from 'react';
import { 
  Plus, Trash2, CheckCircle, RotateCcw, ChevronDown, 
  ChevronUp, X, ChevronRight, Clock, ArrowDownCircle, 
  Package, Calendar, MoreVertical, FolderOpen, User, AlertTriangle 
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
  
  // Отдельный хендлер для клика по стрелке (чтобы точно сработал)
  const handleChevronClick = (e, id) => {
      e.stopPropagation(); // Чтобы не было двойного клика если он всплывет
      toggleOrder(id);
  };

  const toggleProduct = (id, e) => {
      e.stopPropagation();
      setExpandedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isStandard = (name) => STANDARD_OPERATIONS.includes(name);

  // --- ЛОГИКА ЦВЕТА ПО ДЭДЛАЙНУ ---
  const getOrderStyle = (deadlineStr) => {
      if (!deadlineStr) return 'bg-white border-gray-200';

      const today = new Date();
      today.setHours(0,0,0,0);
      const deadline = new Date(deadlineStr);
      deadline.setHours(0,0,0,0);
      
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) return 'bg-red-50 border-red-200 ring-1 ring-red-100'; 
      if (diffDays <= 7) return 'bg-orange-50 border-orange-200 ring-1 ring-orange-100'; 
      if (diffDays <= 10) return 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'; 
      return 'bg-green-50 border-green-200 ring-1 ring-green-100'; 
  };

  const getDeadlineLabel = (deadlineStr) => {
      if (!deadlineStr) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const deadline = new Date(deadlineStr);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return <span className="text-red-600 font-bold uppercase text-[10px]">Просрочено на {Math.abs(diffDays)} дн!</span>
      if (diffDays === 0) return <span className="text-red-600 font-bold uppercase text-[10px]">Сегодня!</span>
      if (diffDays <= 3) return <span className="text-red-500 font-bold text-[10px]">Осталось: {diffDays} дн.</span>
      return null;
  };

  // --- ЛОГИКА ИСТОРИИ ---
  const getHistorySuggestion = (opName) => {
    if (!opName) return null;
    let totalMins = 0;
    let count = 0;
    products.filter(p => p.status === 'completed').forEach(p => {
        p.operations.forEach(op => {
            if (op.name.toLowerCase() === opName.toLowerCase() && op.actualMinutes > 0) {
                totalMins += op.actualMinutes;
                count++;
            }
        });
    });
    return count > 0 ? Math.round(totalMins / count) : null;
  };

  // --- ГРУППИРОВКА И СОРТИРОВКА ---
  let displayedOrders = orders.filter(o => showHistory ? true : o.status === 'active');

  displayedOrders.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1; 
      if (!b.deadline) return -1; 
      return new Date(a.deadline) - new Date(b.deadline); 
  });

  const orphanProducts = products.filter(p => !p.orderId);

  return (
    <div className="space-y-8 pb-20">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
         <div className="flex gap-4 items-center">
             <h2 className="text-2xl font-bold text-gray-800">Портфель заказов</h2>
             <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-blue-600 hover:underline">
               {showHistory ? 'Скрыть архив' : 'Показать архив'}
             </button>
         </div>
         <button onClick={actions.addOrder} className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700 shadow-lg font-medium transition">
           <Plus size={18} /> Создать новый заказ
         </button>
      </div>

      {/* --- СПИСОК ЗАКАЗОВ (ПАПКИ) --- */}
      <div className="space-y-6">
        {displayedOrders.map(order => {
            const isOrderExpanded = expandedOrderIds.includes(order.id);
            const orderPositions = products.filter(p => p.orderId === order.id);
            
            const totalOrderHours = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + (op.minutesPerUnit * p.quantity), 0), 0) / 60;
            const doneOrderHours = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + ((op.actualMinutes || 0) * p.quantity), 0), 0) / 60;
            const progress = totalOrderHours > 0 ? Math.round((doneOrderHours / totalOrderHours) * 100) : 0;

            const cardStyle = order.status === 'completed' 
                ? 'bg-gray-100 border-gray-200 opacity-70' 
                : getOrderStyle(order.deadline); 

            return (
                <div key={order.id} className={`rounded-xl shadow-md border overflow-hidden transition-all hover:shadow-lg ${cardStyle}`}>
                    
                    {/* ШАПКА ЗАКАЗА */}
                    <div 
                        className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 cursor-pointer relative"
                        onClick={() => toggleOrder(order.id)}
                    >
                        {/* КНОПКА РАСКРЫТИЯ (Теперь видима всегда и кликабельна) */}
                        <div className="absolute right-3 top-3 md:static md:block z-10">
                             <button 
                                onClick={(e) => handleChevronClick(e, order.id)}
                                className="p-2 bg-white/50 rounded-full hover:bg-white transition shadow-sm md:shadow-none md:bg-transparent"
                             >
                                 {isOrderExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                             </button>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center pr-10 md:pr-0">
                            
                            {/* Номер и Клиент */}
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={order.orderNumber}
                                        onClick={e => e.stopPropagation()} // Блокируем раскрытие только при клике ВНУТРЬ поля
                                        onChange={(e) => actions.updateOrder(order.id, 'orderNumber', e.target.value)}
                                        className="font-bold text-lg bg-transparent border-b border-transparent focus:border-black/20 outline-none w-full placeholder-gray-500 text-gray-800 py-1"
                                        placeholder="№ Договора..."
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs opacity-80">
                                    <User size={14} className="text-gray-600 flex-shrink-0" />
                                    <input 
                                        type="text" 
                                        value={order.clientName}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => actions.updateOrder(order.id, 'clientName', e.target.value)}
                                        className="bg-transparent border-b border-transparent focus:border-black/20 outline-none w-full md:w-64 text-gray-700 font-medium py-1"
                                        placeholder="Имя клиента..."
                                    />
                                </div>
                            </div>

                            {/* Дэдлайн и статус */}
                            <div className="flex justify-between md:justify-end items-center gap-4 mt-2 md:mt-0">
                                <div className="text-right flex-1 md:flex-none">
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Дэдлайн</div>
                                        {getDeadlineLabel(order.deadline)}
                                    </div>
                                    <input 
                                        type="date" 
                                        value={order.deadline}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => actions.updateOrder(order.id, 'deadline', e.target.value)}
                                        className={`w-full md:w-auto bg-transparent text-sm font-bold border-b border-transparent focus:border-red-400 outline-none text-right cursor-pointer ${!order.deadline && 'text-red-400'}`}
                                    />
                                </div>
                                
                                <div className="text-right min-w-[50px]">
                                    <div className="text-xl md:text-2xl font-bold leading-none text-gray-800">{progress}%</div>
                                    <div className="text-[10px] uppercase text-gray-400">Готовность</div>
                                </div>

                                <button 
                                    onClick={(e) => { e.stopPropagation(); actions.deleteOrder(order.id); }}
                                    className="p-2 hover:bg-red-500/10 rounded text-red-400 hover:text-red-600 transition"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ТЕЛО ЗАКАЗА (ПОЗИЦИИ) */}
                    {isOrderExpanded && (
                        <div className="bg-white/50 p-2 md:p-4 border-t border-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                            
                            {/* Тулбар позиций */}
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 tracking-wider">
                                    <FolderOpen size={14} />
                                    Состав заказа ({orderPositions.length})
                                </div>
                                <button 
                                    onClick={() => actions.addProduct(order.id)}
                                    className="text-sm flex items-center gap-1 text-blue-600 font-bold hover:bg-blue-100 px-3 py-1.5 rounded transition"
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
                                        getHistorySuggestion={getHistorySuggestion}
                                        sortedResources={resources.sort((a,b) => a.name.localeCompare(b.name))}
                                        openExecutorDropdown={openExecutorDropdown}
                                        setOpenExecutorDropdown={setOpenExecutorDropdown}
                                    />
                                ))}
                                {orderPositions.length === 0 && (
                                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                        В этом заказе пока нет изделий. Нажмите "Добавить изделие".
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
        {displayedOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                Нет активных заказов. Создайте новый!
            </div>
        )}
      </div>

      {/* --- НЕРАСПРЕДЕЛЕННЫЕ (ЕСЛИ ЕСТЬ) --- */}
      {orphanProducts.length > 0 && (
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
                          getHistorySuggestion={getHistorySuggestion}
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
             
             {/* Сводная строка изделия */}
             <div className="flex flex-col md:flex-row md:items-center p-3 md:p-4 cursor-pointer relative overflow-hidden group gap-2 md:gap-0" onClick={onToggle}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${totalFact >= totalPlan && totalPlan > 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                
                {/* СТРЕЛКА (На мобильном теперь тоже видна справа) */}
                <div className="absolute right-3 top-3 md:static md:block text-gray-400">
                    {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center pl-3 md:pl-0 pr-8 md:pr-0">
                    {/* Название */}
                    <div className="md:col-span-5">
                        <div className="font-bold text-gray-800 text-base md:text-lg">{product.name}</div>
                        <div className="text-xs text-gray-500 flex gap-3 mt-1">
                             <span>Кол-во: <span className="font-bold text-gray-900">{product.quantity} шт.</span></span>
                             {product.startDate && <span>Старт: {product.startDate}</span>}
                        </div>
                    </div>

                    {/* План / Факт */}
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

                    {/* Гант даты */}
                    <div className="md:col-span-3 text-xs text-gray-400 hidden md:block">
                        {ganttItem ? (
                            <div>Расчет: {ganttItem.startDate.toLocaleDateString()} - {ganttItem.endDate.toLocaleDateString()}</div>
                        ) : <span>Нет операций</span>}
                    </div>

                    {/* Кнопки */}
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

                    <div className="bg-white rounded border border-gray-200 overflow-hidden">
                        <div className="grid grid-cols-12 gap-1 md:gap-2 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-2 uppercase tracking-wide">
                            <div className="col-span-1 text-center">№</div>
                            <div className="col-span-5 md:col-span-4">Операция</div>
                            <div className="hidden md:block md:col-span-3">Исполнитель</div>
                            <div className="col-span-3 md:col-span-2 text-center">План</div>
                            <div className="col-span-3 md:col-span-2 text-center text-yellow-600">Факт</div>
                        </div>

                        {product.operations.map((op) => {
                            const isDropdownOpen = openExecutorDropdown === op.id;
                            const historySuggestion = getHistorySuggestion(op.name);

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
                                        {/* Мобильный выбор исполнителя (если экран маленький) */}
                                        <div className="md:hidden mt-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenExecutorDropdown(isDropdownOpen ? null : op.id); }}
                                                className="text-[10px] text-blue-600 underline"
                                            >
                                                {op.resourceIds?.length > 0 ? 'Исполнителей: ' + op.resourceIds.length : 'Выбрать исполнителя'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Десктоп выбор исполнителя */}
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
                                    </div>

                                    {/* Общий дропдаун (позиционируется абсолютно) */}
                                    {isDropdownOpen && (
                                        <div className="absolute top-10 left-10 md:left-1/2 z-50 w-48 bg-white shadow-xl border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
                                            <div className="flex justify-between items-center mb-1 pb-1 border-b">
                                                 <span className="text-xs font-bold">Кто делает?</span>
                                                 <X size={12} onClick={() => setOpenExecutorDropdown(null)}/>
                                            </div>
                                            {sortedResources.map(res => (
                                                <label key={res.id} className="flex items-center gap-2 p-1 hover:bg-blue-50 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={op.resourceIds?.includes(res.id)}
                                                        onChange={() => actions.toggleResourceForOp(product.id, op.id, res.id)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-xs">{res.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setOpenExecutorDropdown(null)}></div>}

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
                                        <button onClick={() => actions.deleteOperation(product.id, op.id)} className="text-gray-300 hover:text-red-500 absolute -right-4 md:-right-6">
                                            <X size={14} />
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