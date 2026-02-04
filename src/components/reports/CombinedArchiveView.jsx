import React, { useState, useMemo } from 'react';
import { RotateCcw, Calendar, ChevronDown, ChevronRight, AlertCircle, Clock, User } from 'lucide-react';

export default function CombinedArchiveView({ orders, products, resources, actions }) {
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
                             />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ArchiveOrderRow({ order, products, resources, actions }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Детальный расчет по операциям
    const { orderLaborCost, orderTotalMinutes, productDetails } = useMemo(() => {
        const oProducts = products.filter(p => p.orderId === order.id);
        let totalCost = 0;
        let totalMins = 0;
        
        const details = oProducts.map(prod => {
            const ops = prod.operations.map(op => {
                const totalFactMins = (op.actualMinutes || 0) * prod.quantity;
                totalMins += totalFactMins;
                
                // Находим имена исполнителей
                const executors = (op.resourceIds || []).map(rid => {
                    const res = resources.find(r => r.id === rid);
                    return res ? res.name : 'Неизвестный';
                });

                // --- ИСПРАВЛЕННЫЙ РАСЧЕТ СТОИМОСТИ ---
                let opCost = 0;
                if (totalFactMins > 0 && op.resourceIds && op.resourceIds.length > 0) {
                    let totalHourlyRateOfTeam = 0; // Сумма часовых ставок всей бригады

                    op.resourceIds.forEach(rid => {
                        const res = resources.find(r => r.id === rid);
                        if (res) {
                            // Проверяем включен ли расчет зарплаты для этого сотрудника
                            // Если salaryEnabled === false, то его ставка = 0 (не учитываем в себестоимости)
                            const salaryEnabled = res.salaryEnabled !== false;
                            // Дневная ставка / 8 часов = Часовая ставка этого сотрудника
                            const hourlyRate = salaryEnabled ? ((parseFloat(res.baseRate) || 0) / 8) : 0;
                            totalHourlyRateOfTeam += hourlyRate;
                        }
                    });

                    // Стоимость = Время (в часах) * Суммарная стоимость часа бригады
                    opCost = (totalFactMins / 60) * totalHourlyRateOfTeam;
                }
                
                totalCost += opCost;

                return {
                    name: op.name,
                    factMins: totalFactMins,
                    executors: executors,
                    cost: opCost
                };
            });

            return {
                name: prod.name,
                quantity: prod.quantity,
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
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`Вернуть заказ ${order.orderNumber} в работу?`)) actions.restoreOrder(order.id); }}
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
                                         <div key={opIdx} className="flex justify-between items-center text-xs text-gray-600 py-1 hover:bg-slate-50 rounded px-1">
                                             <div className="flex-1 font-medium">{op.name}</div>
                                             
                                             <div className="flex-1 flex items-center gap-2 text-gray-500">
                                                 <User size={10} /> 
                                                 {op.executors.length > 0 ? op.executors.join(', ') : '—'}
                                             </div>
                                             
                                             <div className="flex items-center gap-4 text-right">
                                                 <div className="w-16 flex items-center gap-1 justify-end">
                                                     <Clock size={10} className="text-slate-300"/> {(op.factMins/60).toFixed(1)}ч
                                                 </div>
                                                 <div className="w-20 font-bold font-mono text-slate-800 text-right">
                                                     {Math.round(op.cost).toLocaleString()} ₽
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
}