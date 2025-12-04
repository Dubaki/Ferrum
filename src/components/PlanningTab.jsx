import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle, RotateCcw, ChevronDown, ChevronUp, X, ChevronRight } from 'lucide-react';
import { STANDARD_OPERATIONS } from '../utils/constants';

// Принимаем ganttItems, чтобы показать реальные расчетные даты
export default function PlanningTab({ products, resources, actions, ganttItems = [] }) {
  const [showHistory, setShowHistory] = useState(false);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);

  const toggleOrder = (id) => {
      if (expandedOrderIds.includes(id)) {
          setExpandedOrderIds(expandedOrderIds.filter(oid => oid !== id));
      } else {
          setExpandedOrderIds([...expandedOrderIds, id]);
      }
  };

  const sortedResources = [...resources].sort((a,b) => a.name.localeCompare(b.name));
  const isStandard = (name) => STANDARD_OPERATIONS.includes(name);

  // Сортировка по дедлайну
  const sortedProducts = [...products]
    .filter(p => showHistory ? true : p.status === 'active')
    .sort((a, b) => {
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return b.id - a.id;
    });

  return (
    <div className="space-y-6">
      
      {/* ЗАГОЛОВОК */}
      <div className="flex justify-between items-center mt-2">
         <div className="flex gap-4 items-center">
             <h2 className="text-2xl font-bold">Оплаченные заказы</h2>
             <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-blue-600 hover:underline">
               {showHistory ? 'Скрыть завершенные' : 'Показать завершенные'}
             </button>
         </div>
         <button onClick={actions.addProduct} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 shadow-sm font-medium transition">
           <Plus size={18} /> Создать заказ
         </button>
      </div>

      {/* ЗАГОЛОВОК ТАБЛИЦЫ */}
      <div className="grid grid-cols-12 gap-4 px-5 py-2 bg-gray-100 rounded-t-lg text-xs font-bold text-gray-500 uppercase border border-gray-200 border-b-0">
          <div className="col-span-2">№ Заказа</div>
          <div className="col-span-4">Наименование</div>
          <div className="col-span-2 text-center">Расчетный Старт</div>
          <div className="col-span-2 text-center text-red-600">Готовность (Договор)</div>
          <div className="col-span-2 text-right">Действия</div>
      </div>

      {/* СПИСОК ЗАКАЗОВ */}
      <div className="space-y-2">
      {sortedProducts.map(product => {
          const isExpanded = expandedOrderIds.includes(product.id);
          // Ищем расчетные данные для этого заказа
          const simData = ganttItems.find(g => g.productId === product.id);
          
          return (
            <div key={product.id} className={`rounded-lg border transition-all overflow-visible ${product.status === 'completed' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 shadow-sm'}`}>
              
              {/* СТРОКА-СВОДКА */}
              <div 
                className={`grid grid-cols-12 gap-4 items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b border-gray-100 bg-gray-50' : ''}`}
                onClick={() => toggleOrder(product.id)}
              >
                  <div className="col-span-2 font-bold text-gray-800">
                      {product.orderNumber || <span className="text-gray-400 italic text-xs">Без номера</span>}
                  </div>
                  
                  <div className="col-span-4 font-bold text-gray-800 flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                      {product.name}
                      {product.quantity > 1 && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">x{product.quantity}</span>}
                  </div>

                  {/* РАСЧЕТНЫЙ СТАРТ (ИЗ СИМУЛЯЦИИ) */}
                  <div className="col-span-2 text-center text-sm font-semibold text-blue-600">
                      {simData ? simData.startDate.toLocaleDateString('ru-RU') : '-'}
                  </div>

                  <div className="col-span-2 text-center text-sm font-bold text-red-600">
                      {product.deadline ? new Date(product.deadline).toLocaleDateString('ru-RU') : '-'}
                  </div>

                  <div className="col-span-2 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => actions.toggleProductStatus(product.id)}
                            className={`p-1.5 rounded hover:bg-gray-200 transition ${product.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}
                            title={product.status === 'active' ? "Завершить заказ" : "Вернуть в работу"}
                        >
                            {product.status === 'active' ? <CheckCircle size={18} /> : <RotateCcw size={18} />}
                        </button>
                  </div>
              </div>

              {/* РАЗВЕРНУТАЯ ЧАСТЬ */}
              {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* ШАПКА РЕДАКТИРОВАНИЯ */}
                  <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex flex-wrap gap-6 items-start">
                    <div className="w-32">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">№ Заказа</label>
                        <input 
                            type="text" value={product.orderNumber || ''}
                            onChange={e => actions.updateProduct(product.id, 'orderNumber', e.target.value)}
                            className="block w-full text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                            placeholder="№..."
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Наименование</label>
                        <input 
                            type="text" value={product.name}
                            onChange={e => actions.updateProduct(product.id, 'name', e.target.value)}
                            className="block w-full text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded px-3 py-1.5 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Кол-во</label>
                        <input 
                            type="number" value={product.quantity}
                            onChange={e => actions.updateProduct(product.id, 'quantity', Math.max(1, parseInt(e.target.value)))}
                            className="w-full font-semibold bg-white border border-gray-200 rounded px-2 py-1.5 text-center"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Мин. старт (материалы)</label>
                        <input 
                            type="date" value={product.startDate}
                            onChange={e => actions.updateProduct(product.id, 'startDate', e.target.value)}
                            className="block bg-white border border-gray-200 rounded px-3 py-1.5 text-sm font-medium"
                        />
                        {/* ПОДСКАЗКА О РЕАЛЬНОМ СТАРТЕ */}
                        {simData && (
                            <div className="text-[10px] text-blue-600 mt-1">
                                Фактический старт: <b>{simData.startDate.toLocaleDateString('ru-RU')}</b>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-red-400 font-bold uppercase tracking-wider">Дэдлайн (Договор)</label>
                        <input 
                            type="date" value={product.deadline || ''}
                            onChange={e => actions.updateProduct(product.id, 'deadline', e.target.value)}
                            className="block bg-red-50 border border-red-200 text-red-700 rounded px-3 py-1.5 text-sm font-medium focus:border-red-400 outline-none"
                        />
                        {/* ПОДСКАЗКА О РЕАЛЬНОМ ФИНИШЕ */}
                        {simData && (
                            <div className="text-[10px] text-gray-500 mt-1">
                                Расчетный финиш: <b>{simData.endDate.toLocaleDateString('ru-RU')}</b>
                            </div>
                        )}
                    </div>
                    <div className="pt-5 ml-auto">
                        <button onClick={() => actions.deleteProduct(product.id)} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded transition">
                            <Trash2 size={14} /> Удалить
                        </button>
                    </div>
                  </div>

                  {/* ОПЕРАЦИИ */}
                  {product.status === 'active' && (
                  <div className="p-5 bg-gray-50/50">
                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 px-2">
                            <div className="col-span-1 text-center">№</div>
                            <div className="col-span-4">ОПЕРАЦИЯ</div>
                            <div className="col-span-3">ИСПОЛНИТЕЛИ</div>
                            <div className="col-span-3">МИНУТЫ НА 1 ШТ</div>
                            <div className="col-span-1"></div>
                        </div>

                        {product.operations.map((op) => {
                            const totalHours = (op.minutesPerUnit * product.quantity) / 60;
                            const isDropdownOpen = openExecutorDropdown === op.id;
                            
                            return (
                            <div key={op.id} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative z-0">
                                <div className="col-span-1 text-center font-bold text-gray-400">{op.sequence}</div>
                                
                                <div className="col-span-4 flex gap-2">
                                    <select 
                                        value={isStandard(op.name) ? op.name : 'other'}
                                        onChange={(e) => {
                                            if (e.target.value === 'other') {
                                                actions.updateOperation(product.id, op.id, 'name', 'Новая операция');
                                            } else {
                                                actions.updateOperation(product.id, op.id, 'name', e.target.value);
                                            }
                                        }}
                                        className="w-full text-sm font-medium border-b border-gray-200 focus:border-blue-400 outline-none bg-transparent py-1"
                                    >
                                        {STANDARD_OPERATIONS.map(std => (
                                            <option key={std} value={std}>{std}</option>
                                        ))}
                                        <option value="other">Другое...</option>
                                    </select>
                                    
                                    {(!isStandard(op.name)) && (
                                        <input 
                                            type="text"
                                            value={op.name}
                                            onChange={e => actions.updateOperation(product.id, op.id, 'name', e.target.value)}
                                            className="w-full text-sm border-b border-blue-400 outline-none bg-blue-50/20 px-1"
                                            placeholder="Название..."
                                        />
                                    )}
                                </div>

                                {/* ВЫБОР ИСПОЛНИТЕЛЕЙ (ИСПРАВЛЕНО) */}
                                <div className="col-span-3 relative">
                                    <button 
                                        onClick={() => setOpenExecutorDropdown(isDropdownOpen ? null : op.id)}
                                        className={`w-full flex justify-between items-center px-3 py-1.5 border rounded text-xs text-left transition ${
                                            op.resourceIds.length === 0 ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        <span className="truncate">
                                            {op.resourceIds.length > 0 
                                                ? resources.filter(r => op.resourceIds.includes(r.id)).map(r => r.name).join(', ')
                                                : 'Не назначено'}
                                        </span>
                                        <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                                    </button>

                                    {/* DROPDOWN С ВЫСОКИМ Z-INDEX */}
                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2 max-h-64 overflow-y-auto">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                                <span className="text-xs font-bold text-gray-500">Сотрудники</span>
                                                <button onClick={() => setOpenExecutorDropdown(null)}><X size={14}/></button>
                                            </div>
                                            <div className="space-y-1">
                                                {/* Показываем ВСЕХ сотрудников без фильтрации */}
                                                {sortedResources.map(res => (
                                                    <label key={res.id} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 rounded cursor-pointer">
                                                        <input 
                                                            type="checkbox"
                                                            checked={op.resourceIds.includes(res.id)}
                                                            onChange={() => actions.toggleResourceForOp(product.id, op.id, res.id)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-700 font-medium">{res.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setOpenExecutorDropdown(null)}></div>}
                                </div>

                                <div className="col-span-3 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                        type="number" 
                                        value={op.minutesPerUnit}
                                        onChange={e => actions.updateOperation(product.id, op.id, 'minutesPerUnit', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded text-center font-bold"
                                        />
                                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">мин</span>
                                    </div>
                                    <div className="text-xs font-semibold text-blue-600 whitespace-nowrap w-[60px] text-right">
                                        {totalHours.toFixed(1)} ч
                                    </div>
                                </div>

                                <div className="col-span-1 text-right">
                                    <button onClick={() => actions.deleteOperation(product.id, op.id)} className="text-gray-400 hover:text-red-500 transition">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                            )
                        })}
                        
                        <button onClick={() => actions.addOperation(product.id)} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-2 rounded inline-flex items-center gap-1 transition">
                        <Plus size={16} /> Добавить операцию
                        </button>
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>
          );
      })}
      </div>
    </div>
  );
}