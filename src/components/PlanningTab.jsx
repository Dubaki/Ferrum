import React, { useState } from 'react';
import { Plus, Trash2, BarChart3, CheckCircle, RotateCcw, ChevronDown, X } from 'lucide-react';

export default function PlanningTab({ products, resources, resourceLoad, actions }) {
  const [showHistory, setShowHistory] = useState(false);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);

  return (
    <div className="space-y-6">
      {/* ЗАГРУЗКА ЦЕХА */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600"/>
              Загрузка цеха (исходя из активных заказов)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.values(resourceLoad).map(stat => {
                  const daysLoad = stat.maxCapacityPerDay > 0 ? stat.totalHours / stat.maxCapacityPerDay : 0;
                  const loadColor = daysLoad > 14 ? 'bg-red-50 border-red-200' : daysLoad > 7 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
                  const barColor = daysLoad > 14 ? 'bg-red-500' : daysLoad > 7 ? 'bg-yellow-500' : 'bg-blue-500';
                  
                  return (
                      <div key={stat.name} className={`p-3 rounded-lg border ${loadColor}`}>
                          <div className="text-xs text-gray-500 font-medium mb-1 truncate">{stat.name}</div>
                          <div className="text-xl font-bold text-gray-800">{stat.totalHours.toFixed(1)} ч</div>
                          <div className="text-xs text-gray-600 mb-2">~ {daysLoad.toFixed(1)} смен</div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{width: `${Math.min((daysLoad / 14) * 100, 100)}%`}}></div>
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>

      {/* ЗАГОЛОВОК СПИСКА */}
      <div className="flex justify-between items-center mt-8">
         <div className="flex gap-4 items-center">
             <h2 className="text-2xl font-bold">Активные заказы</h2>
             <button 
               onClick={() => setShowHistory(!showHistory)}
               className="text-sm text-blue-600 hover:underline"
             >
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
          <div className="p-5 border-b border-gray-100 flex flex-wrap gap-6 items-start">
             <div className="flex-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Наименование изделия</label>
                <input 
                  type="text" 
                  value={product.name}
                  onChange={e => actions.updateProduct(product.id, 'name', e.target.value)}
                  className="block w-full text-lg font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-colors"
                  disabled={product.status === 'completed'}
                />
             </div>
             <div className="w-24">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Кол-во</label>
                <div className="flex items-center gap-2">
                  <input 
                      type="number" 
                      value={product.quantity}
                      onChange={e => actions.updateProduct(product.id, 'quantity', Math.max(1, parseInt(e.target.value)))}
                      className="w-full font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center"
                      disabled={product.status === 'completed'}
                  />
                  <span className="text-gray-500">шт.</span>
                </div>
             </div>
             <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Старт</label>
                <input 
                  type="date" 
                  value={product.startDate}
                  onChange={e => actions.updateProduct(product.id, 'startDate', e.target.value)}
                  className="block bg-gray-50 border border-gray-200 rounded px-3 py-1 text-sm font-medium"
                  disabled={product.status === 'completed'}
                />
             </div>
             
             <div className="flex items-center gap-2 pt-4">
                {product.status === 'active' ? (
                    <button 
                      onClick={() => actions.toggleProductStatus(product.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold transition border border-green-200"
                    >
                      <CheckCircle size={18} /> Завершить
                    </button>
                ) : (
                    <button 
                      onClick={() => actions.toggleProductStatus(product.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold transition"
                    >
                      <RotateCcw size={18} /> Вернуть
                    </button>
                )}
                
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

                     return (
                       <div key={op.id} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative">
                          <div className="col-span-1 text-center font-bold text-gray-400">{op.sequence}</div>
                          
                          <div className="col-span-4">
                              <input 
                                type="text" 
                                value={op.name}
                                onChange={e => actions.updateOperation(product.id, op.id, 'name', e.target.value)}
                                className="w-full text-sm font-medium border-b border-transparent focus:border-blue-400 outline-none"
                                placeholder="Название..."
                              />
                          </div>

                          <div className="col-span-3 relative">
                              <button 
                                  onClick={() => setOpenExecutorDropdown(isDropdownOpen ? null : op.id)}
                                  className="w-full flex justify-between items-center px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-left text-gray-700 hover:border-blue-400 transition"
                              >
                                  <span className="truncate">
                                      {op.resourceIds.length > 0 
                                          ? resources.filter(r => op.resourceIds.includes(r.id)).map(r => r.name).join(', ')
                                          : 'Не назначено'}
                                  </span>
                                  <ChevronDown size={14} className="text-gray-400 ml-1 flex-shrink-0" />
                              </button>

                              {isDropdownOpen && (
                                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10 p-2">
                                      <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                          <span className="text-xs font-bold text-gray-500">Выберите исполнителей</span>
                                          <button onClick={() => setOpenExecutorDropdown(null)}><X size={14}/></button>
                                      </div>
                                      <div className="space-y-1 max-h-40 overflow-y-auto">
                                          {resources.map(res => (
                                              <label key={res.id} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 rounded cursor-pointer">
                                                  <input 
                                                      type="checkbox"
                                                      checked={op.resourceIds.includes(res.id)}
                                                      onChange={() => actions.toggleResourceForOp(product.id, op.id, res.id)}
                                                      className="rounded text-blue-600 focus:ring-blue-500"
                                                  />
                                                  <span className="text-sm text-gray-700">{res.name}</span>
                                              </label>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              {isDropdownOpen && <div className="fixed inset-0 z-0" onClick={() => setOpenExecutorDropdown(null)}></div>}
                          </div>

                          <div className="col-span-3 flex items-center gap-2">
                             <div className="relative flex-1">
                                 <input 
                                   type="number" 
                                   value={op.minutesPerUnit}
                                   onChange={e => actions.updateOperation(product.id, op.id, 'minutesPerUnit', parseFloat(e.target.value) || 0)}
                                   className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded text-center font-bold"
                                 />
                                 <span className="absolute right-8 top-1.5 text-xs text-gray-400">мин/шт</span>
                             </div>
                             <div className="text-xs font-semibold text-blue-600 whitespace-nowrap min-w-[50px]">
                                 = {totalHours.toFixed(1)} ч
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