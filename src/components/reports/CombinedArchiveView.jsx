import React, { useState, useMemo } from 'react';
import { RotateCcw, Calendar, ChevronDown, ChevronRight, AlertCircle, Clock, User, History, X } from 'lucide-react';
import { getRoleLabel } from '../../utils/supplyRoles';
import { ORDER_STATUSES } from '../../utils/constants';

export default function CombinedArchiveView({ orders, products, resources, actions, userRole }) {
    const completedOrders = useMemo(() => orders
        .filter(o => o.status === 'completed')
        .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0)), [orders]);

    const groupedByMonth = useMemo(() => {
        const groups = {};
        completedOrders.forEach(order => {
            const date = order.finishedAt ? new Date(order.finishedAt) : new Date(order.createdAt);
            const key = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(order);
        });
        return groups;
    }, [completedOrders]);

    if (completedOrders.length === 0) {
        return <div className="text-center py-10 text-gray-400">Архив пуст. Нет завершенных заказов.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3 items-start">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="font-bold mb-1">Архив производства</p>
                    <p>Здесь рассчитывается точная себестоимость труда. Расчет: <b>(Сумма часовых ставок всех исполнителей) × (Фактическое время)</b>.</p>
                </div>
            </div>

            {Object.keys(groupedByMonth).map(monthKey => (
                <div key={monthKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-700 capitalize flex items-center gap-2">
                            <Calendar size={20} /> {monthKey}
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {groupedByMonth[monthKey].map(order => (
                             <ArchiveOrderRow 
                                key={order.id} 
                                order={order} 
                                products={products} 
                                resources={resources} 
                                actions={actions}
                                userRole={userRole}
                             />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ArchiveOperationRow({ op, prod, resources, actions }) {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState((op.actualMinutes || 0) / (prod.quantity || 1));
    const [showResMenu, setShowResMenu] = useState(false);

    const handleSave = () => {
        if (!op.id) {
            alert('Ошибка: у операции нет ID. Попробуйте вернуть заказ в работу и завершить его снова для генерации ID.');
            return;
        }
        actions.updateOperation(prod.id, op.id, 'actualMinutes', parseFloat(val));
        setIsEditing(false);
    };

    return (
        <div className="flex justify-between items-center text-xs text-gray-600 py-2 hover:bg-slate-50 rounded-xl px-2 group/op border border-transparent hover:border-slate-100 transition-all relative">
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Кнопка удаления - ТЕПЕРЬ ВИДИМАЯ И КРАСНАЯ */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Удалить операцию "${op.name}"?`)) {
                            actions.deleteOperation(prod.id, op.id);
                        }
                    }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                >
                    <X size={14} strokeWidth={3} />
                </button>

                <input 
                    type="text" 
                    defaultValue={op.name}
                    onBlur={(e) => op.id && actions.updateOperation(prod.id, op.id, 'name', e.target.value)}
                    className="bg-transparent border-none focus:ring-0 p-0 font-bold text-slate-700 w-full outline-none hover:bg-white focus:bg-white rounded px-1.5 py-1 transition-all"
                />
            </div>
            
            <div className="flex-1 flex items-center gap-2 text-gray-500 relative px-2">
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!op.id) {
                            alert('У этой операции нет ID (старые данные). Пожалуйста, удалите её и добавьте заново через кнопку "+ Добавить операцию"');
                            return;
                        }
                        setShowResMenu(!showResMenu); 
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all border ${op.resourceIds?.length > 0 ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-500'}`}
                >
                    <User size={12} strokeWidth={op.resourceIds?.length > 0 ? 3 : 2} /> 
                    <span className="max-w-[120px] truncate">
                        {op.executors.length > 0 ? op.executors.join(', ') : 'Выбрать...'}
                    </span>
                </button>
                
                {showResMenu && (
                    <>
                        {/* НЕВИДИМЫЙ ФОН ДЛЯ ЗАКРЫТИЯ ПРИ КЛИКЕ МИМО */}
                        <div 
                            className="fixed inset-0 z-[90] bg-transparent" 
                            onClick={() => setShowResMenu(false)}
                        ></div>

                        <div className="absolute top-full left-0 z-[100] bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 min-w-[240px] max-h-80 overflow-auto animate-in fade-in zoom-in-95 duration-200 mt-2">
                            <div className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest px-1 flex justify-between items-center">
                                Бригада исполнителей
                                <button onClick={() => setShowResMenu(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={14}/></button>
                            </div>
                            <div className="space-y-1">
                                {resources.filter(r => !r.firedAt).map(res => {
                                    const isSelected = op.resourceIds?.includes(res.id);
                                    return (
                                        <button 
                                            key={res.id}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                actions.toggleResourceForOp(prod.id, op.id, res.id);
                                            }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all ${
                                                isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold">{res.name}</span>
                                                <span className={`text-[8px] uppercase tracking-tighter opacity-70 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{res.position}</span>
                                            </div>
                                            {isSelected && <div className="bg-white/20 p-0.5 rounded-full"><X size={10} strokeWidth={4} /></div>}
                                        </button>
                                    );
                                })}
                            </div>
                            <button 
                                onClick={() => setShowResMenu(false)} 
                                className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                            >
                                Готово
                            </button>
                        </div>
                    </>
                )}
            </div>
            
            <div className="flex items-center gap-3 text-right">
                <div className="w-24 flex items-center gap-1 justify-end">
                    {isEditing ? (
                        <input 
                            type="number" 
                            value={val} 
                            onChange={e => setVal(e.target.value)}
                            className="w-16 border-2 border-indigo-500 rounded-lg px-2 py-1 text-right font-black focus:ring-4 focus:ring-indigo-100 outline-none"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            onBlur={handleSave}
                        />
                    ) : (
                        <button 
                            onClick={() => { setVal((op.actualMinutes || 0) / (prod.quantity || 1)); setIsEditing(true); }}
                            className="hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all"
                        >
                            <Clock size={12} className="text-slate-400"/>
                            <span className="text-slate-700">{(op.factMins/60).toFixed(1)}ч</span>
                        </button>
                    )}
                </div>
                <div className="w-20 font-black font-mono text-slate-900 text-[13px] text-right tabular-nums">
                    {Math.round(op.cost).toLocaleString()} ₽
                </div>
            </div>
        </div>
    );
}

function ArchiveOrderRow({ order, products, resources, actions, userRole }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const formatDateTime = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadge = (role) => {
        const roles = {
            technologist: 'bg-blue-100 text-blue-700',
            supplier: 'bg-yellow-100 text-yellow-700',
            shopManager: 'bg-indigo-100 text-indigo-700',
            director: 'bg-purple-100 text-purple-700',
            vesta: 'bg-orange-100 text-orange-700',
            master: 'bg-slate-100 text-slate-700',
            manager: 'bg-cyan-100 text-cyan-700',
            admin: 'bg-red-100 text-red-700'
        };
        return roles[role] || 'bg-slate-50 text-slate-500';
    };
    
    // Детальный расчет по операциям
    const { orderLaborCost, orderTotalMinutes, productDetails } = useMemo(() => {
        const oProducts = products.filter(p => p.orderId === order.id);
        let totalCost = 0;
        let totalMins = 0;
        
        const details = oProducts.map(prod => {
            const prodOps = Array.isArray(prod.operations) ? prod.operations : [];
            
            const ops = prodOps.map(op => {
                const totalFactMins = (op.actualMinutes || 0) * (prod.quantity || 1);
                totalMins += totalFactMins;
                
                const resourceIds = Array.isArray(op.resourceIds) ? op.resourceIds : [];
                
                // Находим имена исполнителей
                const executors = resourceIds.map(rid => {
                    const res = resources.find(r => r.id === rid);
                    return res ? res.name : 'Неизвестный';
                });

                // --- ИСПРАВЛЕННЫЙ РАСЧЕТ СТОИМОСТИ ---
                let opCost = 0;
                if (totalFactMins > 0 && resourceIds.length > 0) {
                    let totalHourlyRateOfTeam = 0; // Сумма часовых ставок всей бригады

                    resourceIds.forEach(rid => {
                        const res = resources.find(r => r.id === rid);
                        if (res) {
                            const salaryEnabled = res.salaryEnabled !== false;
                            const hourlyRate = salaryEnabled ? ((parseFloat(res.baseRate) || 0) / 8) : 0;
                            totalHourlyRateOfTeam += hourlyRate;
                        }
                    });

                    opCost = (totalFactMins / 60) * totalHourlyRateOfTeam;
                }
                
                totalCost += opCost;

                return {
                    ...op, 
                    resourceIds, // Гарантируем, что это массив
                    name: op.name || 'Без названия',
                    factMins: totalFactMins,
                    executors: executors,
                    cost: opCost
                };
            });

            return {
                id: prod.id,
                name: prod.name || 'Без названия',
                quantity: prod.quantity || 1,
                operations: ops
            };
        });

        return { orderLaborCost: totalCost, orderTotalMinutes: totalMins, productDetails: details };
    }, [products, resources, order.id]);

    return (
        <div className="hover:bg-gray-50 transition group">
            <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3 flex-1">
                    <button className="text-gray-400 group-hover:text-blue-500 transition">
                        {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                    </button>
                    <div>
                        <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            {order.orderNumber || 'Без номера'}
                            {isExpanded && <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Развернуто</span>}
                        </div>
                        <div className="text-sm text-gray-500">{order.clientName}</div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-right w-full md:w-auto justify-between md:justify-end">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Трудозатраты</div>
                        <div className="font-bold text-gray-700">{(orderTotalMinutes/60).toFixed(1)} ч</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Себестоимость</div>
                        <div className="font-bold text-blue-700 text-lg">{Math.round(orderLaborCost).toLocaleString()} ₽</div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`Вернуть заказ ${order.orderNumber} в работу?`)) actions.restoreOrder(order.id, userRole); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" 
                        title="Вернуть в работу"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* ДЕТАЛИЗАЦИЯ */}
            {isExpanded && (
                <div className="bg-slate-50/80 p-4 border-t border-gray-100 pl-4 md:pl-12 animate-in slide-in-from-top-2">
                     <div className="space-y-4">
                        {productDetails.map((prod, idx) => (
                             <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                 <div className="font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1">
                                     {prod.name} <span className="text-xs text-gray-400 font-normal">x{prod.quantity} шт.</span>
                                 </div>
                                 
                                 <div className="space-y-1">
                                     {prod.operations.map((op, opIdx) => (
                                         <ArchiveOperationRow 
                                            key={opIdx}
                                            op={op}
                                            prod={prod}
                                            resources={resources}
                                            actions={actions}
                                         />
                                     ))}
                                     
                                     {/* Кнопка добавления операции в архиве */}
                                     <button 
                                        onClick={() => {
                                            console.log('Adding operation to product:', prod.id);
                                            actions.addOperation(prod.id, 'Новая операция');
                                        }}
                                        className="w-full mt-2 py-2 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                     >
                                         + Добавить операцию
                                     </button>
                                 </div>
                             </div>
                        ))}

                        {/* ИСТОРИЯ ДЕЙСТВИЙ В АРХИВЕ */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white/50">
                                <button 
                                    onClick={() => setShowHistory(!showHistory)} 
                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition text-left"
                                >
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <History size={14} strokeWidth={3} />
                                        История заказа ({order.statusHistory.length})
                                    </span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                                </button>
                                {showHistory && (
                                    <div className="p-3 space-y-2 border-t border-slate-100 max-h-48 overflow-y-auto custom-scrollbar bg-white/30 backdrop-blur-sm">
                                        {order.statusHistory.slice().reverse().map((entry, idx) => (
                                            <div key={idx} className="text-[10px] p-2.5 bg-white/80 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1.5 transition-all hover:border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 font-bold">{formatDateTime(entry.timestamp)}</span>
                                                        <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] tracking-tighter ${getRoleBadge(entry.role)}`}>
                                                            {getRoleLabel(entry.role)}
                                                        </span>
                                                    </div>
                                                    {entry.status && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter border ${Array.isArray(ORDER_STATUSES) ? (ORDER_STATUSES.find(s => s.id === entry.status)?.color || 'text-slate-400 border-slate-200') : 'text-slate-400 border-slate-200'}`}>
                                                            {Array.isArray(ORDER_STATUSES) ? (ORDER_STATUSES.find(s => s.id === entry.status)?.label || entry.status) : entry.status}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.note && (
                                                    <div className="font-bold text-slate-700 leading-tight border-l-2 border-slate-200 pl-2 ml-1">
                                                        {entry.note}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
}