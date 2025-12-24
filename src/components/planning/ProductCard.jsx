import React, { useState } from 'react';
import { Clock, CheckCircle, Trash2, ChevronDown, Plus, Copy, ShoppingBag } from 'lucide-react'; // Добавил Copy
import OperationRow from './OperationRow';

function ProductCard({ product, products, orders, actions, resources, sortedResources, openExecutorDropdown, setOpenExecutorDropdown, isAdmin }) {
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

    // Находим следующую невыполненную операцию (первую без фактического времени)
    const sortedOps = [...(product.operations || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const nextOp = sortedOps.find(op => (op.actualMinutes || 0) === 0);

    return (
        <div className={`relative bg-gradient-to-r from-white to-slate-50/30 rounded-lg border-l-4 border-y border-r shadow-lg hover:shadow-xl transition-all duration-200 overflow-visible ${
            isExpanded
                ? 'border-l-orange-500 border-orange-200 ring-2 ring-orange-100 shadow-orange-100'
                : 'border-l-blue-400 border-slate-200 hover:border-l-blue-500 hover:border-slate-300'
        }`}>

             {/* Заголовок карточки */}
             <div className="flex items-center p-3 gap-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shrink-0 shadow-sm`}></div>

                <div className="flex-1 font-bold text-slate-800 text-sm flex items-start sm:items-center gap-2 flex-wrap min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ShoppingBag size={14} className="text-blue-500 shrink-0" />
                        <span className="min-w-0">{product.name}</span>
                        {product.isResale && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-cyan-600 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                                <ShoppingBag size={10} /> Перепродажа
                            </span>
                        )}
                        <span className="text-slate-400 text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded shrink-0">x{product.quantity}</span>
                    </div>

                    {/* Показываем следующую операцию */}
                    {!product.isResale && nextOp && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                            Следующая: {nextOp.name}
                        </span>
                    )}
                    {/* Если все выполнено - показываем "Готово" */}
                    {!product.isResale && !nextOp && totalOps > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                            <CheckCircle size={10} /> Готово
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    {!product.isResale && (
                        <span className="hidden sm:flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-slate-400">
                            <Clock size={12}/> {(totalFact/60).toFixed(1)} / {(totalPlan/60).toFixed(1)} ч
                        </span>
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
                    <div className="flex gap-3 mb-2 bg-white p-2 rounded border border-slate-200 items-end">
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Название</label>
                            <input 
                                type="text" 
                                value={product.name} 
                                onChange={e => actions.updateProduct(product.id, 'name', e.target.value)} 
                                disabled={!isAdmin}
                                className={`w-full border-b border-slate-200 py-1 text-xs font-bold text-slate-800 outline-none transition-colors ${isAdmin ? 'focus:border-orange-500' : 'bg-transparent'}`}
                                placeholder="Название детали" 
                            />
                        </div>
                        <div className="w-16">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Кол-во</label>
                            <input 
                                type="number" 
                                value={product.quantity} 
                                onChange={e => actions.updateProduct(product.id, 'quantity', parseInt(e.target.value))} 
                                disabled={!isAdmin}
                                className={`w-full border-b border-slate-200 py-1 text-xs font-bold text-center text-slate-800 outline-none transition-colors ${isAdmin ? 'focus:border-orange-500' : 'bg-transparent'}`}
                            />
                        </div>
                        
                        {/* Переключатель типа (Товар/Изделие) */}
                        <div className="flex flex-col items-center">
                             <label className="text-[9px] font-bold text-slate-400 uppercase mb-1">Тип</label>
                             <button
                                onClick={() => isAdmin && actions.updateProduct(product.id, 'isResale', !product.isResale)}
                                disabled={!isAdmin}
                                className={`h-[26px] px-2 rounded flex items-center gap-1 transition-colors border ${product.isResale ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-slate-50 border-slate-200 text-slate-400'} ${isAdmin ? 'hover:text-slate-600' : 'cursor-default'}`}
                                title={product.isResale ? "Товар (перепродажа)" : "Изделие (производство)"}
                            >
                                <ShoppingBag size={14} />
                                <span className="text-[10px] font-bold uppercase">{product.isResale ? 'Товар' : 'Изд.'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Список операций */}
                    {!product.isResale ? (
                        <div className="space-y-2">
                            {/* Сортируем операции по sequence перед отображением */}
                            {(() => {
                                const sortedOps = [...product.operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                                return sortedOps.map((op, idx) => (
                                    <OperationRow
                                        key={op.id}
                                        op={op}
                                        product={product}
                                        products={products}
                                        orders={orders}
                                        productId={product.id}
                                        actions={actions}
                                        resources={resources}
                                        isAdmin={isAdmin}
                                        isOpen={openExecutorDropdown === op.id}
                                        onToggleDropdown={() => setOpenExecutorDropdown(openExecutorDropdown === op.id ? null : op.id)}
                                        isFirst={idx === 0}
                                        isLast={idx === sortedOps.length - 1}
                                        onMoveUp={() => actions.moveOperationUp(product.id, op.id)}
                                        onMoveDown={() => actions.moveOperationDown(product.id, op.id)}
                                    />
                                ));
                            })()}
                        </div>
                    ) : (
                        <div className="p-4 bg-cyan-50/50 rounded-lg border border-cyan-100 text-center text-cyan-800 text-xs font-medium">
                            Это товар для перепродажи. Производственные операции не требуются.
                        </div>
                    )}
                    
                    {/* КНОПКИ ДЕЙСТВИЙ */}
                    {isAdmin && <div className="flex gap-2 pt-2">
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
                    </div>}
                </div>
             )}
        </div>
    )
}

// Мемоизация для предотвращения лишних перерисовок
export default React.memo(ProductCard);