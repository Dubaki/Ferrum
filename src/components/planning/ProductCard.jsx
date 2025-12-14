import React, { useState } from 'react';
import { Clock, CheckCircle, Trash2, ChevronDown, Plus, Copy, ShoppingBag } from 'lucide-react'; // Добавил Copy
import OperationRow from './OperationRow';

function ProductCard({ product, actions, resources, sortedResources, openExecutorDropdown, setOpenExecutorDropdown }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Расчет статуса по операциям
    let totalOps = 0; 
    let doneOps = 0;
    product.operations.forEach(op => { 
        totalOps++; 
        if((op.actualMinutes || 0) > 0) doneOps++; 
    });
    
    const isDone = totalOps > 0 && doneOps === totalOps;
    const inProgress = doneOps > 0 && !isDone;
    
    let statusColor = 'bg-slate-300';
    if (isDone) statusColor = 'bg-emerald-500';
    else if (product.isResale) statusColor = 'bg-cyan-500';
    else if (inProgress) statusColor = 'bg-orange-500 animate-pulse';

    // Расчет времени для инфо
    const totalPlan = product.operations.reduce((acc, op) => acc + (op.minutesPerUnit * product.quantity), 0);
    const totalFact = product.operations.reduce((acc, op) => acc + ((op.actualMinutes || 0) * product.quantity), 0);

    return (
        <div className={`bg-white rounded-lg border shadow-sm transition-all duration-200 overflow-visible ${isExpanded ? 'border-orange-300 ring-1 ring-orange-100 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
             
             {/* Заголовок карточки */}
             <div className="flex items-center p-3 gap-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className={`w-2 h-2 rounded-full ${statusColor} shrink-0`}></div>
                
                <div className="flex-1 font-bold text-slate-700 text-sm truncate flex items-center gap-2">
                    {product.name} 
                    {product.isResale && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-cyan-600 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            <ShoppingBag size={10} /> Перепродажа
                        </span>
                    )}
                    <span className="text-slate-400 text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded">x{product.quantity}</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    {!product.isResale && (
                        <>
                            <span className="hidden sm:flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-slate-400">
                                <Clock size={12}/> {(totalFact/60).toFixed(1)} / {(totalPlan/60).toFixed(1)} ч
                            </span>
                            <span className="flex items-center gap-1 font-bold">
                                <CheckCircle size={12} className={isDone ? 'text-emerald-500' : 'text-slate-300'}/> 
                                {doneOps}/{totalOps}
                            </span>
                        </>
                    )}
                    
                    <div className="flex gap-1 pl-2 border-l border-slate-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => actions.deleteProduct(product.id)} className="p-1 text-slate-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>
                    </div>
                </div>
             </div>

             {/* Раскрывающаяся часть */}
             {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-3 animate-in slide-in-from-top-1">
                    
                    {/* Редактирование параметров изделия */}
                    <div className="flex gap-3 mb-2 bg-white p-2 rounded border border-slate-200">
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Название</label>
                            <input 
                                type="text" 
                                value={product.name} 
                                onChange={e => actions.updateProduct(product.id, 'name', e.target.value)} 
                                className="w-full border-b border-slate-200 py-1 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition-colors" 
                                placeholder="Название детали" 
                            />
                        </div>
                        <div className="w-16">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Кол-во</label>
                            <input 
                                type="number" 
                                value={product.quantity} 
                                onChange={e => actions.updateProduct(product.id, 'quantity', parseInt(e.target.value))} 
                                className="w-full border-b border-slate-200 py-1 text-xs font-bold text-center text-slate-800 outline-none focus:border-orange-500 transition-colors" 
                            />
                        </div>
                    </div>

                    {/* Список операций */}
                    {!product.isResale ? (
                        <div className="space-y-2">
                            {product.operations.map((op, idx) => (
                                <OperationRow 
                                    key={op.id} 
                                    op={op} 
                                    productId={product.id} 
                                    actions={actions} 
                                    resources={resources} 
                                    isOpen={openExecutorDropdown === op.id} 
                                    onToggleDropdown={() => setOpenExecutorDropdown(openExecutorDropdown === op.id ? null : op.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-cyan-50/50 rounded-lg border border-cyan-100 text-center text-cyan-800 text-xs font-medium">
                            Это товар для перепродажи. Производственные операции не требуются.
                        </div>
                    )}
                    
                    {/* КНОПКИ ДЕЙСТВИЙ */}
                    <div className="flex gap-2 pt-2">
                        {!product.isResale && (
                            <button
                                onClick={() => actions.addOperation(product.id)} 
                                className="flex-1 py-2 text-[10px] font-bold border border-dashed rounded transition flex items-center justify-center gap-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 border-slate-300 hover:border-orange-300"
                            >
                                <Plus size={14} /> ДОБАВИТЬ ОПЕРАЦИЮ
                            </button>
                        )}

                        {/* КНОПКА КОПИРОВАНИЯ */}
                        {product.operations.length > 0 && (
                            <button 
                                onClick={() => actions.copyOperationsToAll(product.id)} 
                                className="px-3 py-2 text-[10px] font-bold text-blue-400 hover:text-white hover:bg-blue-500 border border-dashed border-blue-200 hover:border-blue-500 rounded transition flex items-center justify-center gap-2"
                                title="Скопировать эти операции во ВСЕ остальные изделия этого заказа"
                            >
                                <Copy size={14} /> ВСЕМ
                            </button>
                        )}
                    </div>
                </div>
             )}
        </div>
    )
}

// Мемоизация для предотвращения лишних перерисовок
export default React.memo(ProductCard);