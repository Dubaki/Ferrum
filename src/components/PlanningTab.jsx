import React, { useState } from 'react';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, 
  Package, FolderOpen, User, CheckCircle, 
  Calendar, Clock, Search
} from 'lucide-react';
import { STANDARD_OPERATIONS } from '../utils/constants';

const styles = `
  @keyframes shine {
    0% { left: -100%; opacity: 0; }
    50% { opacity: 0.5; }
    100% { left: 100%; opacity: 0; }
  }
  .shiny-effect {
    position: relative;
    overflow: hidden;
  }
  .shiny-effect::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
    transform: skewX(-20deg);
    transition: none;
  }
  .shiny-effect:hover::after {
    animation: shine 0.7s ease-in-out;
  }
`;

export default function PlanningTab({ products, resources, actions, ganttItems = [], orders = [] }) {
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleOrder = (id) => setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const activeOrders = orders
    .filter(o => o.status === 'active')
    .filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; 
        if (!b.deadline) return -1; 
        return new Date(a.deadline) - new Date(b.deadline); 
    });

  const orphanProducts = products.filter(p => !p.orderId);

  return (
    <div className="space-y-6 pb-20 fade-in font-sans text-slate-800">
      <style>{styles}</style>
      
      {/* --- Action Bar --- */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pt-4 mb-6">
         <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <FolderOpen className="text-orange-600" size={32} />
                Текущие заказы
            </h2>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64 group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                 <input 
                    type="text" 
                    placeholder="Поиск по № или клиенту..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 pl-10 pr-4 py-2.5 rounded-lg focus:border-slate-500 focus:ring-0 outline-none transition-all shadow-sm font-bold text-sm"
                 />
             </div>

             <button 
                onClick={actions.addOrder} 
                className="shiny-effect flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-orange-600 transition-all active:scale-95 font-bold uppercase tracking-wide text-xs"
             >
               <Plus size={16} strokeWidth={3} /> Создать заказ
             </button>
         </div>
      </div>

      {/* --- СПИСОК ЗАКАЗОВ --- */}
      <div className="grid gap-4">
        {activeOrders.map(order => (
            <OrderCard 
                key={order.id} 
                order={order} 
                products={products} 
                actions={actions}
                resources={resources}
                ganttItems={ganttItems}
                isExpanded={expandedOrderIds.includes(order.id)}
                onToggle={() => toggleOrder(order.id)}
                openExecutorDropdown={openExecutorDropdown}
                setOpenExecutorDropdown={setOpenExecutorDropdown}
            />
        ))}
        
        {activeOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-slate-400">
                <FolderOpen size={48} className="mb-4 opacity-50"/>
                <p className="font-bold text-lg uppercase tracking-wide">Список заказов пуст</p>
            </div>
        )}
      </div>

      {/* --- СКЛАД (НЕРАСПРЕДЕЛЕННЫЕ) --- */}
      {orphanProducts.length > 0 && (
          <div className="mt-12 bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center shadow-lg">
                      <Package size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Нераспределенные изделия</h3>
              </div>
              <div className="space-y-4">
                  {orphanProducts.map(product => (
                      <ProductCard 
                          key={product.id} product={product}
                          actions={actions} resources={resources}
                          ganttItem={ganttItems.find(g => g.productId === product.id)}
                          sortedResources={resources}
                          openExecutorDropdown={openExecutorDropdown} setOpenExecutorDropdown={setOpenExecutorDropdown}
                          isOrphan={true}
                      />
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}

function OrderCard({ order, products, actions, resources, ganttItems, isExpanded, onToggle, openExecutorDropdown, setOpenExecutorDropdown }) {
    const orderPositions = products.filter(p => p.orderId === order.id);
    
    const totalMins = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + (op.minutesPerUnit * p.quantity), 0), 0);
    const doneMins = orderPositions.reduce((sum, p) => sum + p.operations.reduce((s, op) => s + ((op.actualMinutes || 0) * p.quantity), 0), 0);
    const progress = totalMins > 0 ? Math.min(100, Math.round((doneMins / totalMins) * 100)) : 0;

    // --- ЛОГИКА ЦВЕТОВ РАМОК ---
    const getUrgencyStyles = (dateStr) => {
        if (!dateStr) return { 
            classes: 'border-l-4 border-slate-400 bg-white', 
            badge: 'bg-slate-200 text-slate-600',
            text: 'Срок не задан' 
        };
        
        const daysLeft = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        
        // КРАСНЫЙ (Просрочено или сегодня)
        if (daysLeft <= 0) return { 
            classes: 'border-l-[6px] border-l-red-600 border-y border-r border-red-200 bg-red-50/60 shadow-red-100', 
            badge: 'bg-red-600 text-white shadow-md shadow-red-500/40 animate-pulse',
            text: daysLeft === 0 ? 'СЕГОДНЯ!' : `ПРОСРОЧЕНО ${Math.abs(daysLeft)} ДН.` 
        };
        // ОРАНЖЕВЫЙ (Горит, < 3 дней)
        if (daysLeft <= 3) return { 
            classes: 'border-l-[6px] border-l-orange-500 border-y border-r border-orange-200 bg-orange-50/60 shadow-orange-100', 
            badge: 'bg-orange-500 text-white shadow-md shadow-orange-500/40',
            text: `ОСТАЛОСЬ ${daysLeft} ДН.` 
        };
        // ЖЕЛТЫЙ (Внимание, < 10 дней)
        if (daysLeft <= 10) return { 
            classes: 'border-l-[6px] border-l-yellow-400 border-y border-r border-yellow-200 bg-yellow-50/40 shadow-yellow-100', 
            badge: 'bg-yellow-400 text-slate-900 font-bold',
            text: `${daysLeft} ДН.` 
        };
        // ЗЕЛЕНЫЙ (Норма)
        return { 
            classes: 'border-l-[6px] border-l-emerald-500 border-y border-r border-emerald-200 bg-emerald-50/30 shadow-emerald-100', 
            badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            text: `${daysLeft} ДН.` 
        };
    };

    const urgency = getUrgencyStyles(order.deadline);

    return (
        <div className={`shiny-effect relative rounded-r-lg shadow-sm transition-all duration-200 ${urgency.classes} ${isExpanded ? 'shadow-xl scale-[1.01] z-10' : 'hover:shadow-md'}`}>
            
            <div className="p-4 flex flex-col md:flex-row gap-4 md:items-center cursor-pointer" onClick={onToggle}>
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button className={`p-2 rounded-lg transition-colors border ${isExpanded ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:border-orange-400 hover:text-orange-500'}`}>
                        {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                    </button>
                    
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ЗАКАЗ №</span>
                            <input 
                                type="text" value={order.orderNumber} onClick={e => e.stopPropagation()}
                                onChange={(e) => actions.updateOrder(order.id, 'orderNumber', e.target.value)}
                                className="font-black text-xl text-slate-800 bg-transparent outline-none uppercase tracking-tight w-full hover:bg-black/5 rounded px-1 -ml-1 transition"
                                placeholder="---"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <User size={14} className="text-slate-400"/>
                            <input 
                                type="text" value={order.clientName} onClick={e => e.stopPropagation()}
                                onChange={(e) => actions.updateOrder(order.id, 'clientName', e.target.value)}
                                className="bg-transparent outline-none w-full hover:text-orange-600 transition placeholder-slate-400"
                                placeholder="Клиент..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 pl-14 md:pl-0 justify-between md:justify-end">
                    <div className="flex flex-col w-32 md:w-40">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <span>Готовность</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2.5 bg-white border border-slate-200 rounded-sm overflow-hidden">
                            <div 
                                className={`h-full rounded-sm shadow-sm transition-all duration-500 relative overflow-hidden
                                    ${progress === 100 ? 'bg-emerald-500' : 'bg-slate-700'}
                                `} 
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 w-full h-full" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Срок</span>
                        <div className="relative group/date">
                            <input 
                                type="date" value={order.deadline} onClick={e => e.stopPropagation()}
                                onChange={(e) => actions.updateOrder(order.id, 'deadline', e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-transform active:scale-95 ${urgency.badge}`}>
                                <Calendar size={12} /> {urgency.text}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1 border-l border-slate-200/50 pl-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => actions.finishOrder(order.id)} className="p-2 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all" title="Завершить">
                            <CheckCircle size={20} />
                        </button>
                        <button onClick={() => actions.deleteOrder(order.id)} className="p-2 text-slate-300 hover:text-white hover:bg-red-500 rounded-lg transition-all" title="Удалить">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-200 p-4 md:p-6 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FolderOpen size={14}/> Состав заказа ({orderPositions.length})
                        </h4>
                        <button 
                            onClick={() => actions.addProduct(order.id)} 
                            className="text-xs font-bold text-white bg-slate-800 hover:bg-orange-600 px-3 py-1.5 rounded transition flex items-center gap-1 shadow-md"
                        >
                            <Plus size={14} /> ДОБАВИТЬ ИЗДЕЛИЕ
                        </button>
                    </div>

                    <div className="space-y-3">
                        {orderPositions.map(product => (
                            <ProductCard 
                                key={product.id} 
                                product={product}
                                actions={actions} 
                                resources={resources}
                                ganttItem={ganttItems.find(g => g.productId === product.id)}
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

function ProductCard({ product, actions, resources, sortedResources, openExecutorDropdown, setOpenExecutorDropdown, ganttItem }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const totalPlan = product.operations.reduce((acc, op) => acc + (op.minutesPerUnit * product.quantity), 0);
    const totalFact = product.operations.reduce((acc, op) => acc + ((op.actualMinutes || 0) * product.quantity), 0);
    
    let statusColor = 'bg-slate-400';
    if (totalPlan > 0) {
        if (totalFact >= totalPlan) statusColor = 'bg-emerald-500'; 
        else if (totalFact > 0) statusColor = 'bg-orange-500 animate-pulse';
        else statusColor = 'bg-slate-300';
    }

    return (
        <div className={`bg-white rounded-lg border shadow-sm transition-all overflow-hidden ${isExpanded ? 'border-orange-300 ring-1 ring-orange-100' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex items-stretch cursor-pointer h-14" onClick={() => setIsExpanded(!isExpanded)}>
                <div className={`w-1.5 ${statusColor}`}></div>
                
                <div className="flex-1 flex items-center px-4 gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-sm md:text-base truncate">{product.name}</span>
                            {product.quantity > 1 && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">x{product.quantity}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1"><Clock size={10}/> План: {(totalPlan/60).toFixed(1)}ч</span>
                            {totalFact > 0 && <span className="text-orange-600 flex items-center gap-1"><CheckCircle size={10}/> Факт: {(totalFact/60).toFixed(1)}ч</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-l border-slate-100 pl-4 h-full">
                        <button onClick={(e) => { e.stopPropagation(); actions.deleteProduct(product.id); }} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Название детали</label>
                            <input type="text" value={product.name} onChange={e => actions.updateProduct(product.id, 'name', e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium focus:border-orange-500 outline-none" />
                        </div>
                        <div className="w-20">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Кол-во</label>
                            <input type="number" value={product.quantity} onChange={e => actions.updateProduct(product.id, 'quantity', parseInt(e.target.value))} className="w-full border border-slate-300 rounded px-2 py-2 text-center text-sm font-bold focus:border-orange-500 outline-none" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-12 gap-1 bg-slate-100 px-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <div className="col-span-1 text-center">№</div>
                            <div className="col-span-4">Операция</div>
                            <div className="col-span-3">Кто делает</div>
                            <div className="col-span-2 text-center">План (мин)</div>
                            <div className="col-span-2 text-center">Факт (мин)</div>
                        </div>
                        {product.operations.map((op, idx) => (
                            <OperationRow 
                                key={op.id} op={op} idx={idx} productId={product.id} actions={actions} resources={sortedResources}
                                isOpen={openExecutorDropdown === op.id} onToggleDropdown={() => setOpenExecutorDropdown(openExecutorDropdown === op.id ? null : op.id)}
                            />
                        ))}
                        <button onClick={() => actions.addOperation(product.id)} className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition flex items-center justify-center gap-2 border-t border-slate-100">
                            <Plus size={14} /> ДОБАВИТЬ ОПЕРАЦИЮ
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function OperationRow({ op, idx, productId, actions, resources, isOpen, onToggleDropdown }) {
    const isStandard = (name) => STANDARD_OPERATIONS ? STANDARD_OPERATIONS.includes(name) : false;
    return (
        <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition relative">
            <div className="col-span-1 text-center font-bold text-slate-300 text-xs">{op.sequence}</div>
            <div className="col-span-4">
                {STANDARD_OPERATIONS ? (
                    <select 
                        value={isStandard(op.name) ? op.name : 'other'} 
                        onChange={(e) => actions.updateOperation(productId, op.id, 'name', e.target.value === 'other' ? 'Новая' : e.target.value)} 
                        className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-orange-600"
                    >
                        {STANDARD_OPERATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="other">Свой вариант...</option>
                    </select>
                ) : (
                    <input type="text" value={op.name} className="w-full text-xs font-bold"/>
                )}
                {!isStandard(op.name) && (
                    <input type="text" value={op.name} onChange={e => actions.updateOperation(productId, op.id, 'name', e.target.value)} className="w-full text-xs text-orange-600 border-b border-orange-200 outline-none mt-1" placeholder="Название..." />
                )}
            </div>
            <div className="col-span-3 relative">
                <button onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }} className={`w-full text-left text-[10px] font-bold px-2 py-1 rounded border transition flex justify-between items-center uppercase tracking-wide ${op.resourceIds?.length > 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'}`}>
                    <span className="truncate">{op.resourceIds?.length > 0 ? `${op.resourceIds.length} ЧЕЛ.` : 'НАЗНАЧИТЬ'}</span>
                </button>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }}></div>
                        <div className="absolute top-full left-0 z-50 w-48 bg-white shadow-xl border border-slate-200 rounded-lg p-1 mt-1 max-h-48 overflow-y-auto">
                            {resources.map(res => (
                                <label key={res.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition">
                                    <input type="checkbox" checked={op.resourceIds?.includes(res.id)} onChange={() => actions.toggleResourceForOp(productId, op.id, res.id)} className="rounded text-orange-600 focus:ring-orange-500 border-slate-300"/>
                                    <span className="text-xs font-medium text-slate-700">{res.name}</span>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="col-span-2 text-center">
                <input type="number" value={op.minutesPerUnit} onChange={e => actions.updateOperation(productId, op.id, 'minutesPerUnit', parseFloat(e.target.value))} className="w-12 text-center text-xs bg-slate-100 rounded py-1 outline-none focus:bg-white focus:ring-1 focus:ring-orange-400 transition font-mono" />
            </div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1">
                <input type="number" value={op.actualMinutes || 0} onChange={e => actions.updateOperation(productId, op.id, 'actualMinutes', parseFloat(e.target.value))} className="w-12 text-center text-xs font-bold bg-orange-50 text-orange-700 rounded py-1 outline-none focus:ring-1 focus:ring-orange-400 transition font-mono" />
                <button onClick={() => actions.deleteOperation(productId, op.id)} className="text-slate-300 hover:text-red-500 p-1 transition"><Trash2 size={12}/></button>
            </div>
        </div>
    );
}