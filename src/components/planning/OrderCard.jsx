import React, { useState, memo } from 'react';
import { ChevronDown, ChevronRight, User, Settings, CheckCircle, Plus, Copy, PenTool, Truck, Info, Calendar, AlertOctagon, Wallet, Star, Droplet } from 'lucide-react';
import { ORDER_STATUSES } from '../../utils/constants';
import ProductCard from './ProductCard';

const OrderCard = memo(function OrderCard({
    order, products, actions, resources, isExpanded, onToggle,
    openExecutorDropdown, setOpenExecutorDropdown,
    isStatusMenuOpen, onToggleStatusMenu, onOpenSettings,
    onAddProduct, // Функция добавления изделия
    onCopyFromArchive // Функция копирования из архива
}) {
    const orderPositions = products.filter(p => p.orderId === order.id);
    const [showDeadlineDetails, setShowDeadlineDetails] = useState(false);
    
    // --- АНАЛИТИКА ТРУДОЧАСОВ ---
    let totalPlanMins = 0;
    let totalFactMins = 0;
    orderPositions.forEach(p => {
        p.operations.forEach(op => {
            const qty = p.quantity || 1;
            totalPlanMins += (op.minutesPerUnit || 0) * qty;
            totalFactMins += (op.actualMinutes || 0); 
        });
    });

    const remainingMins = Math.max(0, totalPlanMins - totalFactMins);
    const remainingManHours = (remainingMins / 60).toFixed(1);
    const progress = totalPlanMins > 0 ? Math.round((totalFactMins / totalPlanMins) * 100) : 0;

    // --- РАСЧЕТ РАБОЧИХ ДНЕЙ ---
    const getWorkDays = (start, end) => {
        let count = 0;
        let cur = new Date(start);
        const endDate = new Date(end);
        cur.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);
        while (cur <= endDate) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    };

    // --- ДЕДЛАЙН И ЧАСЫ ---
    const calculateDeadlineInfo = (dateStr) => {
        if (!dateStr) return { days: null, color: 'text-slate-400', label: 'Нет срока', border: 'border-l-4 border-slate-400 bg-white' };
        
        const today = new Date();
        const target = new Date(dateStr);
        const diffTime = target - today;
        const diffCalendarDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffCalendarDays < 0) {
            return { 
                text: `${diffCalendarDays}`, 
                sub: 'ПРОСРОЧЕНО',
                color: 'text-red-600', 
                border: 'border-l-[6px] border-l-red-600 border-y border-r border-red-200 bg-red-50/60 shadow-red-100',
                isLate: true
            };
        }

        const workDays = getWorkDays(today, target);
        const availableHours = workDays * 8; 

        let color = 'text-emerald-600';
        let border = 'border-l-[6px] border-l-emerald-500 border-emerald-200 bg-emerald-50/30 shadow-emerald-100';

        if (workDays <= 3) { color = 'text-orange-600'; border = 'border-l-[6px] border-l-orange-500 border-orange-200 bg-orange-50/60 shadow-orange-100'; }
        else if (workDays <= 10) { color = 'text-yellow-600'; border = 'border-l-[6px] border-l-yellow-400 border-yellow-200 bg-yellow-50/40 shadow-yellow-100'; }

        return { 
            text: `${workDays}`, 
            sub: 'ОСТАЛОСЬ',
            color, border, availableHours, workDays
        };
    };

    const getCountdown = (dateStr) => {
        if (!dateStr) return null;
        return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    };

    const dlInfo = calculateDeadlineInfo(order.deadline);
    const drawDiff = getCountdown(order.drawingsDeadline);
    const matDiff = getCountdown(order.materialsDeadline);
    const currentStatus = ORDER_STATUSES.find(s => s.id === order.customStatus) || ORDER_STATUSES[0];

    const handleStatusChange = (statusId) => {
        if (statusId === 'metal' && !order.materialsDeadline) return alert("Сначала укажите дату поставки металла в настройках!");
        if (statusId === 'drawings' && !order.drawingsDeadline) return alert("Сначала укажите дату готовности КМД в настройках!");
        actions.updateOrder(order.id, 'customStatus', statusId);
    };

    // Подсветка важного заказа
    const importantHighlight = order.isImportant
        ? 'ring-4 ring-amber-300 bg-amber-50/40 shadow-amber-200'
        : '';

    return (
        <div className={`relative rounded-r-lg shadow-sm transition-all duration-200 ${dlInfo.border} ${importantHighlight}
            ${isStatusMenuOpen || showDeadlineDetails ? 'z-50' : (isExpanded ? 'shadow-xl sm:scale-[1.01] z-10' : 'hover:shadow-md')}
        `}>

            <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 relative" onClick={onToggle}>

                {/* Mobile: Header Row */}
                <div className="flex items-center justify-between gap-2">
                    {/* Left: Settings + Star + Info */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <button onClick={onOpenSettings} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-md shrink-0 border border-slate-700">
                            <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.updateOrder(order.id, 'isImportant', !order.isImportant);
                            }}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all shadow-md shrink-0 border-2 ${
                                order.isImportant
                                    ? 'bg-amber-400 text-white border-amber-500 hover:bg-amber-500'
                                    : 'bg-white text-slate-300 border-slate-200 hover:border-amber-300 hover:text-amber-400'
                            }`}
                            title={order.isImportant ? 'Убрать из важных' : 'Отметить как важный'}
                        >
                            <Star size={16} className={`sm:w-[18px] sm:h-[18px] ${order.isImportant ? 'fill-current' : ''}`} />
                        </button>

                        <button className={`hidden md:block p-1 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-600' : 'text-slate-300'}`}>
                            {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </button>

                        <div className="flex flex-col min-w-0">
                            <div className="font-black text-lg sm:text-xl text-slate-800 uppercase tracking-tight leading-none truncate">{order.orderNumber || 'БЕЗ НОМЕРА'}</div>
                            <div className="text-[10px] sm:text-xs text-slate-500 font-bold flex items-center gap-1 mt-0.5 sm:mt-1 truncate uppercase tracking-wider">
                                <User size={10} className="sm:w-3 sm:h-3 text-slate-400"/> {order.clientName || 'Нет клиента'}
                            </div>
                        </div>
                    </div>

                    {/* Right: Deadline (Mobile) */}
                    <div className="flex flex-col items-end sm:hidden" onClick={e => e.stopPropagation()}>
                        <div className={`text-2xl font-black leading-none ${dlInfo.color}`}>{dlInfo.text || '—'}</div>
                        <div className="text-[9px] font-bold text-slate-400">{dlInfo.sub}</div>
                    </div>
                </div>

                {/* Mobile: Status + Delivery Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 sm:hidden" onClick={e => e.stopPropagation()}>
                    {/* Status Button */}
                    <div className="relative">
                        <button onClick={onToggleStatusMenu} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 transition-all shadow-sm active:scale-95 text-[10px] ${currentStatus.color}`}>
                            <span className="font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={12}/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white shadow-2xl rounded-xl p-2 z-[60] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu({ stopPropagation: () => {} }); }} className={`px-3 py-2.5 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[50]" onClick={onToggleStatusMenu}></div>}
                    </div>

                    {/* Delivery Buttons (Mobile) */}
                    {order.drawingsDeadline && !order.drawingsArrived && (
                        <button onClick={() => window.confirm('Подтвердить прибытие КМД?') && actions.updateOrder(order.id, 'drawingsArrived', true)}
                            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${drawDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                            <PenTool size={10}/> {drawDiff}д
                        </button>
                    )}
                    {order.materialsDeadline && !order.materialsArrived && (
                        <button onClick={() => window.confirm('Подтвердить прибытие материалов?') && actions.updateOrder(order.id, 'materialsArrived', true)}
                            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${matDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            <Truck size={10}/> {matDiff}д
                        </button>
                    )}

                    {/* Complete Button (Mobile) */}
                    <button onClick={() => actions.finishOrder(order.id)} className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all" title="Завершить">
                        <CheckCircle size={18} />
                    </button>
                </div>

                {/* Desktop: Full Row Layout */}
                <div className="hidden sm:flex items-center gap-4">
                    {/* Expand Icon (desktop only) */}
                    <button className={`hidden md:block p-1 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-600' : 'text-slate-300'}`}>
                        {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>

                {/* 2. ЦЕНТР: КНОПКИ ПОСТАВОК */}
                <div className="flex items-center gap-2 z-20 shrink-0" onClick={e => e.stopPropagation()}>
                    {order.drawingsDeadline && !order.drawingsArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие КМД?')) {
                                    actions.updateOrder(order.id, 'drawingsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                                drawDiff < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1"><PenTool size={10}/> КМД</div>
                            <div className="font-bold text-xs leading-none mt-0.5">{drawDiff < 0 ? `-${Math.abs(drawDiff)} дн` : (drawDiff === 0 ? 'Сегодня' : `${drawDiff} дн`)}</div>
                        </button>
                    )}
                    {order.materialsDeadline && !order.materialsArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие материалов?')) {
                                    actions.updateOrder(order.id, 'materialsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                                matDiff < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1"><Truck size={10}/> Материалы</div>
                            <div className="font-bold text-xs leading-none mt-0.5">{matDiff < 0 ? `-${Math.abs(matDiff)} дн` : (matDiff === 0 ? 'Сегодня' : `${matDiff} дн`)}</div>
                        </button>
                    )}
                    {order.paintDeadline && !order.paintArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие краски?')) {
                                    actions.updateOrder(order.id, 'paintArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                                getCountdown(order.paintDeadline) < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1"><Droplet size={10}/> Краска</div>
                            <div className="font-bold text-xs leading-none mt-0.5">
                                {getCountdown(order.paintDeadline) < 0
                                    ? `-${Math.abs(getCountdown(order.paintDeadline))} дн`
                                    : (getCountdown(order.paintDeadline) === 0 ? 'Сегодня' : `${getCountdown(order.paintDeadline)} дн`)
                                }
                            </div>
                        </button>
                    )}
                </div>

                {/* 3. ЦЕНТР: СТАТУС */}
                <div className="flex items-center justify-center z-20 shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                        <button onClick={onToggleStatusMenu} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all shadow-sm active:scale-95 ${currentStatus.color}`}>
                            <span className="text-xs font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={14}/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white shadow-2xl rounded-xl p-2 z-[60] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu({ stopPropagation: () => {} }); }} className={`px-3 py-3 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[50]" onClick={onToggleStatusMenu}></div>}
                    </div>
                </div>

                {/* 4. ПРАВАЯ ЧАСТЬ */}
                <div className="flex items-center gap-6 justify-end flex-1 z-10 relative" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                        <button className="flex flex-col items-end group outline-none" onClick={() => setShowDeadlineDetails(!showDeadlineDetails)}>
                            <div className={`text-4xl font-black leading-none transition-transform group-hover:scale-105 ${dlInfo.color} mb-1`}>{dlInfo.text || '—'}</div>
                            {order.deadline && (
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 group-hover:text-slate-600">
                                    {new Date(order.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            )}
                        </button>
                        {showDeadlineDetails && (
                            <>
                                <div className="fixed inset-0 z-[50] cursor-default" onClick={() => setShowDeadlineDetails(false)}></div>
                                <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                                        <h4 className="font-bold flex items-center gap-2"><Calendar size={18}/> Аналитика времени</h4>
                                        <div className="text-xs bg-white/10 px-2 py-1 rounded font-mono">{progress}% готово</div>
                                    </div>
                                    <div className="p-6 relative">
                                        {!dlInfo.isLate ? (
                                            <div className="grid grid-cols-2 gap-6 relative">
                                                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-slate-100"></div>
                                                <div className="text-center">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Осталось работы</div>
                                                    <div className="text-3xl font-black text-slate-800 leading-none mb-1">{remainingManHours}</div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase">Человеко/часов</div>
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Всего по заказу</div>
                                                        <div className="font-mono text-xs font-bold text-slate-600">{(totalPlanMins/60).toFixed(1)} ч</div>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Ресурс времени</div>
                                                    <div className="text-3xl font-black text-emerald-600 leading-none mb-1">{dlInfo.availableHours}</div>
                                                    <div className="text-xs font-bold text-emerald-700/60 uppercase">Часов (на 1 чел)</div>
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Нужно людей</div>
                                                        <div className={`inline-block px-3 py-1 rounded text-sm font-black ${remainingManHours > dlInfo.availableHours ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{dlInfo.availableHours > 0 ? Math.ceil(remainingManHours / dlInfo.availableHours) : '∞'} чел.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full pb-4 text-center px-4">
                                                <AlertOctagon size={48} className="text-red-500 mb-4 animate-bounce"/>
                                                <div className="text-red-600 font-black text-lg uppercase mb-2">ЗАКАЗ ПРОСРОЧЕН</div>
                                                <div className="text-slate-600 font-bold text-sm bg-red-50 p-4 rounded-xl border border-red-100 w-full">Необходимо закончить как можно быстрее!</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-end mr-2">
                         <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Wallet size={10} /> Оплата</span>
                         <span className="font-bold text-slate-700 text-sm">{order.paymentDate ? new Date(order.paymentDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) : '—'}</span>
                    </div>

                    <div className="flex gap-1 border-l border-slate-200/50 pl-4">
                        <button onClick={() => actions.finishOrder(order.id)} className="p-2 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all" title="Завершить"><CheckCircle size={22} /></button>
                    </div>
                </div>
            </div>
            </div>

            {/* РАСКРЫВАЮЩАЯСЯ ЧАСТЬ */}
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
                    
                    {/* КНОПКИ ДОБАВЛЕНИЯ */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            onClick={() => onAddProduct()}
                            className="py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-600 transition font-bold flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Добавить изделие
                        </button>

                        <button
                            onClick={() => onCopyFromArchive()}
                            className="py-3 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-400 hover:border-indigo-500 hover:text-indigo-600 transition font-bold flex items-center justify-center gap-2"
                        >
                            <Copy size={18} /> Копировать из архива
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default OrderCard;