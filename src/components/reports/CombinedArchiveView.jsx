import React, { useState, useMemo } from 'react';
import { RotateCcw, Calendar, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

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
                    <p className="font-bold mb-1">Управление архивом</p>
                    <p>Это единый раздел для просмотра истории. Если нашли ошибку, нажмите <RotateCcw size={12} className="inline"/> <b>"Вернуть в работу"</b>, исправьте данные в разделе "Заказы" и сдайте заказ снова.</p>
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
    
    const { orderLaborCost, orderTotalMinutes, productCosts } = useMemo(() => {
        const oProducts = products.filter(p => p.orderId === order.id);
        let totalCost = 0;
        let totalMins = 0;
        const pCosts = [];

        oProducts.forEach(p => {
            let pCost = 0;
            p.operations.forEach(op => {
                const actualTimeHours = (op.actualMinutes || 0) * p.quantity / 60;
                totalMins += (op.actualMinutes || 0) * p.quantity;

                if (actualTimeHours > 0 && op.resourceIds?.length > 0) {
                    let totalRate = 0; 
                    let count = 0;
                    op.resourceIds.forEach(rid => {
                        const res = resources.find(r => r.id === rid);
                        if (res) { 
                            totalRate += (parseFloat(res.baseRate) || 0) / 8; 
                            count++; 
                        }
                    });
                    const avgHourlyRate = count > 0 ? totalRate / count : 0;
                    pCost += actualTimeHours * avgHourlyRate;
                }
            });
            totalCost += pCost;
            pCosts.push({ ...p, cost: pCost });
        });

        return { orderLaborCost: totalCost, orderTotalMinutes: totalMins, productCosts: pCosts };
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
                        onClick={(e) => { e.stopPropagation(); actions.restoreOrder(order.id); }} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" 
                        title="Вернуть в работу"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-gray-50/80 p-4 border-t border-gray-100 pl-4 md:pl-12 animate-in slide-in-from-top-2">
                     <div className="space-y-2">
                        {productCosts.map(prod => (
                             <div key={prod.id} className="flex justify-between items-center text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
                                 <div>
                                    <div className="font-bold text-gray-700">{prod.name}</div>
                                    <div className="text-xs text-gray-400">{prod.quantity} шт.</div>
                                 </div>
                                 <div className="font-mono font-medium bg-gray-100 px-2 py-1 rounded">
                                    {Math.round(prod.cost).toLocaleString()} ₽
                                 </div>
                             </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
}