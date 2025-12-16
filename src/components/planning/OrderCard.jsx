import React, { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, User, Settings, CheckCircle, Plus, Copy, PenTool, Truck, Calendar, AlertOctagon, Wallet, Star, Droplet, ShoppingBag, X } from 'lucide-react';
import { ORDER_STATUSES } from '../../utils/constants';
import ProductCard from './ProductCard';

const OrderCard = memo(function OrderCard({
    order, products, orders, actions, resources, isExpanded, onToggle,
    openExecutorDropdown, setOpenExecutorDropdown,
    isStatusMenuOpen, onToggleStatusMenu, onOpenSettings,
    onAddProduct, // Функция добавления изделия
    onCopyFromArchive, // Функция копирования из архива
    isAdmin // Права админа
}) {
    const orderPositions = products.filter(p => p.orderId === order.id);
    const [showDeadlineDetails, setShowDeadlineDetails] = useState(false);

    // --- АНАЛИТИКА ТРУДОЧАСОВ ---
    let totalPlanMins = 0;
    let totalFactMins = 0;
    let resaleCount = 0; // Счетчик товаров перепродажи

    orderPositions.forEach(p => {
        if (p.isResale) {
            resaleCount++;
        } else {
            p.operations.forEach(op => {
                const qty = p.quantity || 1;
                totalPlanMins += (op.minutesPerUnit || 0) * qty;
                totalFactMins += (op.actualMinutes || 0);
            });
        }
    });

    // --- ПОИСК СЛЕДУЮЩЕЙ ОПЕРАЦИИ ДЛЯ ВСЕГО ЗАКАЗА ---
    let nextOrderOp = null;
    let nextOpProductName = null;

    for (const product of orderPositions) {
        if (product.isResale) continue;

        const sortedOps = [...(product.operations || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const productNextOp = sortedOps.find(op => (op.actualMinutes || 0) === 0);

        if (productNextOp) {
            nextOrderOp = productNextOp;
            nextOpProductName = product.name;
            break; // Берем первую найденную невыполненную операцию
        }
    }

    const remainingMins = Math.max(0, totalPlanMins - totalFactMins);
    const remainingManHours = (remainingMins / 60).toFixed(1);
    const progress = totalPlanMins > 0 ? Math.round((totalFactMins / totalPlanMins) * 100) : 0;
    
    const isResaleOrder = totalPlanMins === 0 && resaleCount > 0 && orderPositions.length > 0;

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
        today.setHours(0, 0, 0, 0);

        // Вычитаем 1 день из дедлайна (нулевой день - день запаса перед отгрузкой)
        const target = new Date(dateStr);
        target.setDate(target.getDate() - 1);
        target.setHours(0, 0, 0, 0);

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

    const borderClass = isResaleOrder ? 'border-l-[6px] border-l-cyan-500 border-cyan-200 bg-cyan-50/40 shadow-cyan-100' : dlInfo.border;

    return (
        <div className={`relative rounded-lg shadow-sm transition-all duration-200 border border-slate-200/60 ${borderClass} ${importantHighlight} ${isExpanded ? 'shadow-xl sm:scale-[1.01] z-10 border-slate-300' : 'hover:shadow-md hover:border-slate-300/80'} ${isStatusMenuOpen ? 'z-[998]' : ''}`}>
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative cursor-pointer" onClick={onToggle}>

                {/* Mobile: Header Row */}
                <div className="flex items-center justify-between gap-2 sm:hidden">
                    {/* Left: Settings + Star + Info */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {isAdmin && (
                            <button onClick={onOpenSettings} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-md shrink-0 border border-slate-700">
                                <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                        )}

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

                        <div className="flex flex-col min-w-0">
                            <div className="font-black text-lg sm:text-xl text-slate-800 uppercase tracking-tight leading-none truncate">{order.orderNumber || 'БЕЗ НОМЕРА'}</div>
                            <div className="text-[10px] sm:text-xs text-slate-500 font-bold flex items-center gap-1 mt-0.5 sm:mt-1 truncate uppercase tracking-wider">
                                <User size={10} className="sm:w-3 sm:h-3" /> {order.clientName || 'Клиент не указан'}
                            </div>
                            {/* Следующая операция */}
                            {!isResaleOrder && nextOrderOp && (
                                <div className="mt-1 flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                        → {nextOrderOp.name}
                                    </span>
                                    <span className="text-[8px] text-slate-400 truncate">({nextOpProductName})</span>
                                </div>
                            )}
                            {/* Если все выполнено */}
                            {!isResaleOrder && !nextOrderOp && totalPlanMins > 0 && (
                                <div className="mt-1">
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 w-fit">
                                        <CheckCircle size={9} /> Готово
                                    </span>
                                </div>
                            )}
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
                        <button onClick={isAdmin ? onToggleStatusMenu : undefined} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 transition-all shadow-sm active:scale-95 text-[10px] ${currentStatus.color} ${!isAdmin && 'cursor-default active:scale-100'}`}>
                            <span className="font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={12}/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white shadow-2xl rounded-xl p-2 z-[1000] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu({ stopPropagation: () => {} }); }} className={`px-3 py-2.5 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[999] bg-slate-900/30 backdrop-blur-sm" onClick={onToggleStatusMenu}></div>}
                    </div>

                    {/* Delivery Buttons (Mobile) */}
                    {order.drawingsDeadline && isAdmin && (
                        <button
                            onClick={() => !order.drawingsArrived && window.confirm('Подтвердить прибытие КМД?') && actions.updateOrder(order.id, 'drawingsArrived', true)}
                            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${
                                order.drawingsArrived
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                                    : drawDiff < 0
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            }`}
                        >
                            {order.drawingsArrived ? <CheckCircle size={10}/> : <PenTool size={10}/>} {order.drawingsArrived ? '✓' : `${drawDiff}д`}
                        </button>
                    )}
                    {order.materialsDeadline && isAdmin && (
                        <button
                            onClick={() => !order.materialsArrived && window.confirm('Подтвердить прибытие материалов?') && actions.updateOrder(order.id, 'materialsArrived', true)}
                            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${
                                order.materialsArrived
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                                    : matDiff < 0
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                        >
                            {order.materialsArrived ? <CheckCircle size={10}/> : <Truck size={10}/>} {order.materialsArrived ? '✓' : `${matDiff}д`}
                        </button>
                    )}

                    {/* Завершить → перемещает в отгрузки (Mobile) */}
                    {isAdmin && (
                    <button
                        onClick={() => {
                            if (window.confirm('Завершить заказ и переместить на склад?')) {
                                actions.moveToShipping(order.id);
                            }
                        }}
                        className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                        title="Завершить и переместить на склад"
                    >
                        <CheckCircle size={18} />
                    </button>
                    )}
                </div>

                {/* Desktop: Full Row Layout */}
                <div className="hidden sm:flex items-center w-full relative">
                    
                    {/* 1. ЛЕВАЯ ЧАСТЬ: Инфо о заказе */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                         {/* Expand Icon */}
                        <button className={`hidden md:block p-1 rounded-full transition-colors shrink-0 ${isExpanded ? 'bg-slate-200 text-slate-600' : 'text-slate-300'}`}>
                            {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </button>

                        {/* Settings */}
                        {isAdmin && (
                            <button onClick={onOpenSettings} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-md shrink-0 border border-slate-700">
                                <Settings size={14} />
                            </button>
                        )}

                        {/* Star */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.updateOrder(order.id, 'isImportant', !order.isImportant);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md shrink-0 border-2 ${
                                order.isImportant
                                    ? 'bg-amber-400 text-white border-amber-500 hover:bg-amber-500'
                                    : 'bg-white text-slate-300 border-slate-200 hover:border-amber-300 hover:text-amber-400'
                            }`}
                            title={order.isImportant ? 'Убрать из важных' : 'Отметить как важный'}
                        >
                            <Star size={14} className={`${order.isImportant ? 'fill-current' : ''}`} />
                        </button>

                        {/* Text Info */}
                        <div className="flex flex-col min-w-0 mr-4">
                            <div className="font-black text-lg text-slate-800 uppercase tracking-tight leading-none truncate">{order.orderNumber || 'БЕЗ НОМЕРА'}</div>
                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1 truncate uppercase tracking-wider">
                                <User size={10} /> {order.clientName || 'Клиент не указан'}
                            </div>
                            {/* Следующая операция */}
                            {!isResaleOrder && nextOrderOp && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                                        → {nextOrderOp.name}
                                    </span>
                                    <span className="text-[9px] text-slate-400 truncate">({nextOpProductName})</span>
                                </div>
                            )}
                            {/* Если все выполнено */}
                            {!isResaleOrder && !nextOrderOp && totalPlanMins > 0 && (
                                <div className="mt-1.5">
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 w-fit">
                                        <CheckCircle size={10} /> Готово
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. ЦЕНТР: Поставки и Статус (Абсолютное позиционирование для симметрии) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 z-20" onClick={e => e.stopPropagation()}>
                        
                        {/* Кнопки поставок (слева от статуса) */}
                        {isAdmin && <div className="flex items-center gap-2">
                    {order.drawingsDeadline && (
                        <button
                            onClick={() => {
                                if (!order.drawingsArrived && window.confirm('Подтвердить прибытие КМД?')) {
                                    actions.updateOrder(order.id, 'drawingsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all ${
                                order.drawingsArrived
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm cursor-default'
                                    : drawDiff < 0
                                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:scale-105 active:scale-95'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm hover:scale-105 active:scale-95'
                            }`}
                            title={order.drawingsArrived ? "КМД прибыл" : "Нажмите для подтверждения прибытия"}
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1">
                                {order.drawingsArrived ? <CheckCircle size={10}/> : <PenTool size={10}/>} КМД
                            </div>
                            <div className="font-bold text-xs leading-none mt-0.5">
                                {order.drawingsArrived ? '✓ Прибыл' : (drawDiff < 0 ? `-${Math.abs(drawDiff)} дн` : (drawDiff === 0 ? 'Сегодня' : `${drawDiff} дн`))}
                            </div>
                        </button>
                    )}
                    {order.materialsDeadline && (
                        <button
                            onClick={() => {
                                if (!order.materialsArrived && window.confirm('Подтвердить прибытие материалов?')) {
                                    actions.updateOrder(order.id, 'materialsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all ${
                                order.materialsArrived
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm cursor-default'
                                    : matDiff < 0
                                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:scale-105 active:scale-95'
                                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm hover:scale-105 active:scale-95'
                            }`}
                            title={order.materialsArrived ? "Материалы прибыли" : "Нажмите для подтверждения прибытия"}
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1">
                                {order.materialsArrived ? <CheckCircle size={10}/> : <Truck size={10}/>} Материалы
                            </div>
                            <div className="font-bold text-xs leading-none mt-0.5">
                                {order.materialsArrived ? '✓ Прибыли' : (matDiff < 0 ? `-${Math.abs(matDiff)} дн` : (matDiff === 0 ? 'Сегодня' : `${matDiff} дн`))}
                            </div>
                        </button>
                    )}
                    {order.paintDeadline && (
                        <button
                            onClick={() => {
                                if (!order.paintArrived && window.confirm('Подтвердить прибытие краски?')) {
                                    actions.updateOrder(order.id, 'paintArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-lg border-2 transition-all ${
                                order.paintArrived
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm cursor-default'
                                    : getCountdown(order.paintDeadline) < 0
                                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:scale-105 active:scale-95'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm hover:scale-105 active:scale-95'
                            }`}
                            title={order.paintArrived ? "Краска прибыла" : "Нажмите для подтверждения прибытия"}
                        >
                            <div className="text-[9px] font-black uppercase flex items-center gap-1">
                                {order.paintArrived ? <CheckCircle size={10}/> : <Droplet size={10}/>} Краска
                            </div>
                            <div className="font-bold text-xs leading-none mt-0.5">
                                {order.paintArrived ? '✓ Прибыла' : (
                                    getCountdown(order.paintDeadline) < 0
                                        ? `-${Math.abs(getCountdown(order.paintDeadline))} дн`
                                        : (getCountdown(order.paintDeadline) === 0 ? 'Сегодня' : `${getCountdown(order.paintDeadline)} дн`)
                                )}
                            </div>
                        </button>
                    )} 
                        </div>}

                        {/* Статус (по центру) */}
                        <div className="relative">
                        <button onClick={isAdmin ? onToggleStatusMenu : undefined} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all shadow-sm active:scale-95 ${currentStatus.color} ${!isAdmin && 'cursor-default active:scale-100'}`}>
                            <span className="text-xs font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={14}/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white shadow-2xl rounded-xl p-2 z-[1000] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu({ stopPropagation: () => {} }); }} className={`px-3 py-3 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[999] bg-slate-900/30 backdrop-blur-sm" onClick={onToggleStatusMenu}></div>}
                    </div>
                    </div>

                    {/* 3. ПРАВАЯ ЧАСТЬ: Дедлайн, Оплата, Завершить */}
                    <div className="flex items-center gap-4 justify-end flex-1 z-10" onClick={e => e.stopPropagation()}>
                        
                        {/* Дедлайн */}
                        <div className="relative text-right">
                        <button className="flex flex-col items-end group outline-none" onClick={() => setShowDeadlineDetails(!showDeadlineDetails)}>
                            <div className={`text-4xl font-black leading-none transition-transform group-hover:scale-105 ${dlInfo.color} mb-1`}>{dlInfo.text || '—'}</div>
                            {order.deadline && (
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 group-hover:text-slate-600">
                                    {new Date(order.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            )}
                        </button>
                        {showDeadlineDetails && createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" onClick={() => setShowDeadlineDetails(false)}>
                                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                                        <h4 className="font-bold flex items-center gap-2"><Calendar size={18}/> Аналитика времени</h4>
                                        <button onClick={() => setShowDeadlineDetails(false)} className="p-1 hover:bg-white/10 rounded-lg transition"><X size={18}/></button>
                                    </div>
                                    <div className="p-6 relative">
                                        {/* Прогресс */}
                                        <div className="absolute top-2 right-2 text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">{progress}% готово</div>

                                        {/* Если заказ состоит только из перепродажи или пуст, но есть перепродажа */}
                                        {isResaleOrder ? (
                                            <div className="text-center py-4">
                                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-100 text-cyan-600 mb-3">
                                                    <ShoppingBag size={28} />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-700">Заказ перепродажи</h3>
                                                <p className="text-slate-500 text-xs mt-2 leading-relaxed">В этом заказе только товары для перепродажи.<br/>Учет производственного времени не требуется.</p>
                                            </div>
                                        ) : (
                                            !dlInfo.isLate ? (
                                            <div className="grid grid-cols-2 gap-6 relative pt-4">
                                                <div className="absolute left-1/2 top-8 bottom-4 w-px bg-slate-100"></div>
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
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                        </div>

                        {/* Оплата */}
                        <div className="flex flex-col items-end px-2 border-r border-slate-200/50">
                             <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Wallet size={10} /> Оплата</span>
                             <span className="font-bold text-slate-700 text-sm">{order.paymentDate ? new Date(order.paymentDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) : '—'}</span>
                        </div>

                        {/* Завершить → перемещает в отгрузки */}
                        {isAdmin && (
                        <button
                            onClick={() => {
                                if (window.confirm('Завершить заказ и переместить на склад?')) {
                                    actions.moveToShipping(order.id);
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                            title="Завершить и переместить на склад"
                        >
                            <CheckCircle size={22} />
                        </button>
                        )}
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
                                products={products}
                                orders={orders}
                                actions={actions}
                                resources={resources}
                                sortedResources={resources}
                                isAdmin={isAdmin}
                                openExecutorDropdown={openExecutorDropdown}
                                setOpenExecutorDropdown={setOpenExecutorDropdown}
                            />
                        ))}
                    </div>
                    
                    {/* КНОПКИ ДОБАВЛЕНИЯ */}
                    {isAdmin && (
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
                    )}
                </div>
            )}
        </div>
    );
});

export default OrderCard;