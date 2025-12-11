import React from 'react';
import { ChevronDown, ChevronRight, User, Settings, CheckCircle, Plus, PenTool, Truck } from 'lucide-react';
import { ORDER_STATUSES } from '../../utils/constants';
import ProductCard from './ProductCard';

export default function OrderCard({ 
    order, products, actions, resources, isExpanded, onToggle, 
    openExecutorDropdown, setOpenExecutorDropdown, 
    isStatusMenuOpen, onToggleStatusMenu, onOpenSettings 
}) {
    const orderPositions = products.filter(p => p.orderId === order.id);
    
    // Прогресс
    let totalOps = 0; let doneOps = 0;
    orderPositions.forEach(p => p.operations.forEach(op => {
        totalOps++; if ((op.actualMinutes || 0) > 0) doneOps++;
    }));
    const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;

    // --- ЛОГИКА ТАЙМЕРОВ СНАБЖЕНИЯ ---
    const getCountdown = (dateStr) => {
        if (!dateStr) return null;
        const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const drawDiff = getCountdown(order.drawingsDeadline);
    const matDiff = getCountdown(order.materialsDeadline);

    // Рамки и Сроки
    const calculateDeadline = (dateStr) => {
        if (!dateStr) return { days: null, color: 'text-slate-400', label: 'Нет срока', border: 'border-l-4 border-slate-400 bg-white' };
        const daysLeft = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) return { days: Math.abs(daysLeft), color: 'text-red-600', label: 'ПРОСРОЧЕНО', border: 'border-l-[6px] border-l-red-600 border-y border-r border-red-200 bg-red-50/60 shadow-red-100' };
        if (daysLeft === 0) return { days: 0, color: 'text-red-600 animate-pulse', label: 'СЕГОДНЯ', border: 'border-l-[6px] border-l-red-600 border-red-200 bg-red-50/60' };
        if (daysLeft <= 3) return { days: daysLeft, color: 'text-orange-600', label: 'ОСТАЛОСЬ', border: 'border-l-[6px] border-l-orange-500 border-orange-200 bg-orange-50/60 shadow-orange-100' };
        if (daysLeft <= 10) return { days: daysLeft, color: 'text-yellow-600', label: 'ОСТАЛОСЬ', border: 'border-l-[6px] border-l-yellow-400 border-yellow-200 bg-yellow-50/40 shadow-yellow-100' };
        return { days: daysLeft, color: 'text-emerald-600', label: 'ОСТАЛОСЬ', border: 'border-l-[6px] border-l-emerald-500 border-emerald-200 bg-emerald-50/30 shadow-emerald-100' };
    };

    const dlInfo = calculateDeadline(order.deadline);
    const currentStatus = ORDER_STATUSES.find(s => s.id === order.customStatus) || ORDER_STATUSES[0];

    const getLastStatusTime = () => {
        const history = order.statusHistory || [];
        if (history.length === 0) return '0 ч.';
        const sorted = [...history].sort((a,b) => a.timestamp - b.timestamp);
        const lastEntry = sorted[sorted.length - 1];
        const diffMs = Date.now() - lastEntry.timestamp;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return `${days} дн. ${hours} ч.`;
        return `${hours} ч.`;
    };

    return (
        <div className={`relative rounded-r-lg shadow-sm transition-all duration-200 ${dlInfo.border} 
            ${isStatusMenuOpen ? 'z-50' : (isExpanded ? 'shadow-xl scale-[1.01] z-10' : 'hover:shadow-md')}
        `}>
            
            <div className="p-4 flex flex-col md:flex-row gap-4 relative" onClick={onToggle}>
                
                {/* 1. ЛЕВАЯ ЧАСТЬ */}
                <div className="flex items-center gap-4 flex-1 min-w-0 z-10">
                    <button 
                        onClick={onOpenSettings}
                        className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-lg shrink-0 border border-slate-700 group"
                        title="Настройки заказа"
                    >
                        <Settings size={22} className="group-active:scale-95" />
                    </button>
                    
                    <button className={`hidden md:block p-1 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-600' : 'text-slate-300'}`}>
                        {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>

                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <div className="font-black text-2xl text-slate-800 uppercase tracking-tight leading-none truncate">
                            {order.orderNumber || 'БЕЗ НОМЕРА'}
                        </div>
                        <div className="text-sm text-slate-500 font-bold flex items-center gap-2 mt-1 truncate">
                            <User size={14} className="text-slate-400"/> {order.clientName || 'Клиент не указан'}
                        </div>
                    </div>
                </div>

                {/* 2. НОВЫЙ БЛОК: СТАТУС СНАБЖЕНИЯ И КМД (В ЦЕНТРЕ) */}
                <div className="flex items-center gap-3 z-20" onClick={e => e.stopPropagation()}>
                    {/* КМД Таймер */}
                    {order.drawingsDeadline && (
                        <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${drawDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                            <div className="text-[9px] font-black uppercase flex items-center gap-1">
                                <PenTool size={10}/> КМД
                            </div>
                            <div className="font-bold text-xs">
                                {drawDiff < 0 ? `Проср. ${Math.abs(drawDiff)} дн` : (drawDiff === 0 ? 'Сегодня' : `${drawDiff} дн`)}
                            </div>
                        </div>
                    )}

                    {/* Металл Таймер */}
                    {order.materialsDeadline && (
                        <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${matDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                            <div className="text-[9px] font-black uppercase flex items-center gap-1">
                                <Truck size={10}/> Снабж
                            </div>
                            <div className="font-bold text-xs">
                                {matDiff < 0 ? `Проср. ${Math.abs(matDiff)} дн` : (matDiff === 0 ? 'Сегодня' : `${matDiff} дн`)}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. ЦЕНТРАЛЬНАЯ ЧАСТЬ: Статус и Готовность */}
                <div 
                    className="flex flex-col md:flex-row items-center justify-center gap-6 z-20 md:flex-[1.5] mt-3 md:mt-0" 
                    onClick={e => e.stopPropagation()}
                >
                    {/* Меню статусов */}
                    <div className="relative">
                        <button 
                            onClick={onToggleStatusMenu}
                            className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 transition-all shadow-sm active:scale-95 ${currentStatus.color}`}
                        >
                            <span className="text-xs font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={14}/>
                        </button>

                        <div className="text-[10px] text-center font-mono text-slate-400 mt-1 font-bold">
                            В статусе: {getLastStatusTime()}
                        </div>

                        {/* Выпадающий список */}
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white shadow-2xl rounded-xl p-2 z-[60] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div 
                                        key={st.id} 
                                        onClick={() => {
                                            actions.updateOrder(order.id, 'customStatus', st.id);
                                            onToggleStatusMenu({ stopPropagation: () => {} });
                                        }}
                                        className={`px-3 py-3 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}
                                    >
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[50]" onClick={onToggleStatusMenu}></div>}
                    </div>

                    {/* Готовность (Прогресс) */}
                    <div className="flex flex-col items-center min-w-[140px]">
                        <div className="flex justify-between w-full text-[9px] font-bold text-slate-400 uppercase mb-1 px-1">
                            <span>Готовность</span>
                            <span>{doneOps}/{totalOps} оп.</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 w-full h-full" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.2) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.2) 50%,rgba(255,255,255,.2) 75%,transparent 75%,transparent)', backgroundSize: '8px 8px'}}></div>
                            </div>
                        </div>
                        <div className="text-xs font-black text-slate-700 mt-0.5">{progress}%</div>
                    </div>
                </div>

                {/* 4. ПРАВАЯ ЧАСТЬ: Сроки, Оплата, Действия */}
                <div className="flex items-center gap-6 justify-end flex-1 z-10 mt-3 md:mt-0" onClick={e => e.stopPropagation()}>
                    
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{dlInfo.label}</span>
                        <div className={`text-2xl font-black leading-none ${dlInfo.color}`}>
                            {dlInfo.days !== null ? `${dlInfo.days} дн.` : '—'}
                        </div>
                    </div>

                    {order.paymentDate && (
                        <div className="hidden lg:flex flex-col items-center justify-center px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
                            <span className="text-[8px] uppercase font-bold text-emerald-400">Оплачено</span>
                            <div className="text-[10px] font-bold text-emerald-700">
                                {new Date(order.paymentDate).toLocaleDateString(undefined, {day:'numeric', month:'numeric'})}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-1 border-l border-slate-200/50 pl-4">
                        <button onClick={() => actions.finishOrder(order.id)} className="p-2 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all" title="Завершить">
                            <CheckCircle size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- РАСКРЫВАЮЩАЯСЯ ЧАСТЬ --- */}
            {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 animate-in slide-in-from-top-2">
                    <div className="space-y-3">
                        {orderPositions.map(product => (
                            <ProductCard 
                                key={product.id} 
                                product={product}
                                actions={actions} 
                                resources={resources}
                                sortedResources={resources}
                                openExecutorDropdown={openExecutorDropdown}
                                setOpenExecutorDropdown={setOpenExecutorDropdown}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={() => actions.addProduct(order.id)} 
                        className="mt-4 w-full py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-600 transition font-bold flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Добавить изделие
                    </button>
                </div>
            )}
        </div>
    );
}