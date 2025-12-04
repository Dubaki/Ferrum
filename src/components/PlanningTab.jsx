import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle, RotateCcw, ChevronDown, X } from 'lucide-react';
import { STANDARD_OPERATIONS } from '../utils/constants';

export default function PlanningTab({ products, resources, actions }) {
  const [showHistory, setShowHistory] = useState(false);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);

  const sortedResources = [...resources].sort((a,b) => a.name.localeCompare(b.name));

  // Проверка: стандартная это операция или "своя"
  const isStandard = (name) => STANDARD_OPERATIONS.includes(name);

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

      {/* СПИСОК ЗАКАЗОВ */}
      {products.filter(p => showHistory ? true : p.status === 'active').sort((a,b) => b.id - a.id).map(product => (
        <div key={product.id} className={`rounded-xl shadow-sm border transition-all ${product.status === 'completed' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200'}`}>
          {/* ШАПКА ЗАКАЗА */}
          <div className="p-5 border-b border-gray-100 flex flex-wrap gap-6 items-start">
             <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Изделие / Заказ</label>
                <input 
                  type="text" value={product.name}
                  onChange={e => actions.updateProduct(product.id, 'name', e.target.value)}
                  className="block w-full text-lg font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-colors"
                  disabled={product.status === 'completed'}
                />
             </div>
             <div className="w-24">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Кол-во</label>
                <input 
                    type="number" value={product.quantity}
                    onChange={e => actions.updateProduct(product.id, 'quantity', Math.max(1, parseInt(e.target.value)))}
                    className="w-full font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center"
                    disabled={product.status === 'completed'}
                />
             </div>
             <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Старт пр-ва</label>
                <input 
                  type="date" value={product.startDate}
                  onChange={e => actions.updateProduct(product.id, 'startDate', e.target.value)}
                  className="block bg-gray-50 border border-gray-200 rounded px-3 py-1 text-sm font-medium"
                  disabled={product.status === 'completed'}
                />
             </div>
             <div>
                <label className="text-xs text-red-400 font-bold uppercase tracking-wider">Готовность</label>
                <input 
                  type="date" value={product.deadline || ''}
                  onChange={e => actions.updateProduct(product.id, 'deadline', e.target.value)}
                  className="block bg-red-50 border border-red-200 text-red-700 rounded px-3 py-1 text-sm font-medium focus:border-red-400 outline-none"
                  disabled={product.status === 'completed'}
                />
             </div>
             <div className="flex items-center gap-2 pt-4 ml-auto">
                <button 
                  onClick={() => actions.toggleProductStatus(product.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${product.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {product.status === 'active' ? <><CheckCircle size={18} /> Завершить</> : <><RotateCcw size={18} /> Вернуть</>}
                </button>
                <button onClick={() => actions.deleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                  <Trash2 size={20} />
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
                     
                     // Логика отображения инпута: Если имя не в списке стандартных - значит это "Другое"
                     const showCustomInput = !isStandard(op.name) && op.name !== '';

                     return (
                       <div key={op.id} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative">
                          <div className="col-span-1 text-center font-bold text-gray-400">{op.sequence}</div>
                          
                          {/* Выбор операции + Инпут для "Другое" */}
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
                              
                              {/* Если выбрано "Другое" (или уже вписано что-то свое), показываем инпут */}
                              {(!isStandard(op.name)) && (
                                  <input 
                                      type="text"
                                      value={op.name}
                                      onChange={e => actions.updateOperation(product.id, op.id, 'name', e.target.value)}
                                      className="w-full text-sm border-b border-blue-400 outline-none bg-blue-50/20 px-1"
                                      placeholder="Введите название..."
                                      autoFocus
                                  />
                              )}
                          </div>

                          {/* Выбор исполнителей (БЕЗ ФИЛЬТРА РОЛЕЙ) */}
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

                              {isDropdownOpen && (
                                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 p-2 max-h-64 overflow-y-auto">
                                      <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                          <span className="text-xs font-bold text-gray-500">Сотрудники</span>
                                          <button onClick={() => setOpenExecutorDropdown(null)}><X size={14}/></button>
                                      </div>
                                      <div className="space-y-1">
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
                              {isDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setOpenExecutorDropdown(null)}></div>}
                          </div>

                          {/* Время и итоги */}
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
      ))}
    </div>
  );
}