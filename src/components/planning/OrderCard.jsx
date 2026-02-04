import React, { useState, memo, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, User, Settings, CheckCircle, Plus, Copy, PenTool, Truck, Calendar, AlertOctagon, Wallet, Star, Droplet, ShoppingBag, X, MessageSquare } from 'lucide-react';
import { ORDER_STATUSES } from '../../utils/constants';
import ProductCard from './ProductCard';
import DrawingsSection from './DrawingsSection';
import NotesModal from './NotesModal';

const OrderCard = memo(function OrderCard({
    order, products, orders, actions, resources, isExpanded, onToggle,
    openExecutorDropdown, setOpenExecutorDropdown,
    isStatusMenuOpen, onToggleStatusMenu, onOpenSettings,
    onAddProduct, // Функция добавления изделия
    onCopyFromArchive, // Функция копирования из архива
    isAdmin // Права админа
}) {
    const orderPositions = useMemo(() => products.filter(p => p.orderId === order.id), [products, order.id]);
    const [showDeadlineDetails, setShowDeadlineDetails] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const hasNotes = Array.isArray(order.notes) ? order.notes.length > 0 : !!order.notes;

    // --- АНАЛИТИКА ТРУДОЧАСОВ ---
    const { totalPlanMins, totalFactMins, resaleCount, remainingManHours, progress, isResaleOrder } = useMemo(() => {
        let planMins = 0;
        let factMins = 0;
        let resale = 0;

        orderPositions.forEach(p => {
            if (p.isResale) {
                resale++;
            } else {
                p.operations.forEach(op => {
                    const qty = p.quantity || 1;
                    planMins += (op.minutesPerUnit || 0) * qty;
                    factMins += (op.actualMinutes || 0);
                });
            }
        });

        const remaining = Math.max(0, planMins - factMins);
        return {
            totalPlanMins: planMins,
            totalFactMins: factMins,
            resaleCount: resale,
            remainingManHours: (remaining / 60).toFixed(1),
            progress: planMins > 0 ? Math.round((factMins / planMins) * 100) : 0,
            isResaleOrder: planMins === 0 && resale > 0 && orderPositions.length > 0
        };
    }, [orderPositions]);

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

    const dlInfo = useMemo(() => calculateDeadlineInfo(order.deadline), [order.deadline]);
    const drawDiff = useMemo(() => getCountdown(order.drawingsDeadline), [order.drawingsDeadline]);
    const matDiff = useMemo(() => getCountdown(order.materialsDeadline), [order.materialsDeadline]);
    const currentStatus = useMemo(() => ORDER_STATUSES.find(s => s.id === order.customStatus) || ORDER_STATUSES[0], [order.customStatus]);

    const handleStatusChange = useCallback((statusId) => {
        if (statusId === 'metal' && !order.materialsDeadline) return alert("Сначала укажите дату поставки металла в настройках!");
        if (statusId === 'drawings' && !order.drawingsDeadline) return alert("Сначала укажите дату готовности КМД в настройках!");
        actions.updateOrder(order.id, 'customStatus', statusId);
    }, [order.id, order.materialsDeadline, order.drawingsDeadline, actions]);

    // Подсветка важного заказа
    const importantHighlight = order.isImportant
        ? 'ring-4 ring-amber-300 bg-amber-50/40 shadow-amber-200'
        : '';

    const borderClass = useMemo(() => isResaleOrder ? 'border-l-[6px] border-l-cyan-500 border-cyan-200 bg-cyan-50/40 shadow-cyan-100' : dlInfo.border, [isResaleOrder, dlInfo.border]);

    return (
        <div className={`relative rounded-lg shadow-md transition-all duration-200 border border-slate-900 ${borderClass} ${importantHighlight} ${isExpanded ? 'shadow-xl sm:scale-[1.01] z-10' : 'hover:shadow-lg'} ${isStatusMenuOpen ? 'z-[998]' : ''}`}>
            <div className="p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 relative cursor-pointer" onClick={() => onToggle(order.id)}>

                {/* Mobile: Header Row */}
                <div className="flex items-center justify-between gap-1.5 sm:hidden">
                    {/* Left: Settings + Star + Info */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {isAdmin && (
                            <button onClick={(e) => onOpenSettings(order, e)} className="w-7 h-7 bg-slate-800 rounded flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-sm shrink-0 border border-slate-700">
                                <Settings size={14} />
                            </button>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.updateOrder(order.id, 'isImportant', !order.isImportant);
                            }}
                            className={`w-7 h-7 rounded flex items-center justify-center transition-all shadow-sm shrink-0 border ${
                                order.isImportant
                                    ? 'bg-amber-400 text-white border-amber-500 hover:bg-amber-500'
                                    : 'bg-white text-slate-300 border-slate-200 hover:border-amber-300 hover:text-amber-400'
                            }`}
                            title={order.isImportant ? 'Убрать из важных' : 'Отметить как важный'}
                        >
                            <Star size={14} className={`${order.isImportant ? 'fill-current' : ''}`} />
                        </button>

                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-black text-base text-slate-800 uppercase tracking-tight leading-tight">{order.orderNumber || 'БЕЗ НОМЕРА'}</div>
                            <div className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5 mt-0.5 uppercase tracking-wider">
                                <User size={8} /> <span>{order.clientName || 'Клиент не указан'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Deadline (Mobile) */}
                    <div className="flex flex-col items-end sm:hidden shrink-0" onClick={e => e.stopPropagation()}>
                        <div className={`text-xl font-black leading-none ${dlInfo.color}`}>{dlInfo.text || '—'}</div>
                        <div className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{dlInfo.sub}</div>
                    </div>
                </div>

                {/* Mobile: Status + Delivery Buttons Row */}
                <div className="flex items-center gap-1.5 sm:hidden w-full" onClick={e => e.stopPropagation()}>
                    {/* GROUP 1: Status */}
                    <div className="relative flex-1">
                        <button onClick={isAdmin ? (e) => onToggleStatusMenu(order.id, e) : undefined} className={`w-full flex items-center justify-center gap-0.5 px-2 py-1 rounded-lg border-2 transition-all shadow-sm active:scale-95 text-[9px] ${currentStatus.color} ${!isAdmin && 'cursor-default active:scale-100'}`}>
                            <span className="font-black uppercase tracking-wider truncate">{currentStatus.label}</span>
                            <ChevronDown size={10} className="shrink-0"/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white shadow-2xl rounded-xl p-2 z-[1000] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu(order.id, { stopPropagation: () => {} }); }} className={`px-3 py-2.5 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[999] bg-slate-900/30 backdrop-blur-sm" onClick={(e) => onToggleStatusMenu(order.id, e)}></div>}
                    </div>

                    {/* Заметки (Mobile) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowNotesModal(true); }}
                        className={`shrink-0 rounded-lg transition-all ${hasNotes ? 'p-1 bg-white text-slate-900 shadow-md border-2 border-slate-800' : 'p-1.5 text-slate-300 hover:text-slate-500'}`}
                        title="Заметки"
                    >
                        <MessageSquare size={hasNotes ? 18 : 14} strokeWidth={hasNotes ? 2.5 : 2} />
                    </button>

                    {/* DIVIDER */}
                    {isAdmin && (order.drawingsDeadline || order.materialsDeadline || order.paintDeadline) && (
                        <div className="h-8 w-px bg-slate-200"></div>
                    )}

                    {/* GROUP 2: Delivery Buttons (Compact Group) */}
                    {isAdmin && (order.drawingsDeadline || order.materialsDeadline || order.paintDeadline) && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                            {order.drawingsDeadline && !order.drawingsArrived && (
                                <button onClick={() => window.confirm('Подтвердить прибытие КМД?') && actions.updateOrder(order.id, 'drawingsArrived', true)}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold transition ${drawDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                                    <PenTool size={9}/> {drawDiff}д
                                </button>
                            )}
                            {order.materialsDeadline && !order.materialsArrived && (
                                <button onClick={() => window.confirm('Подтвердить прибытие материалов?') && actions.updateOrder(order.id, 'materialsArrived', true)}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold transition ${matDiff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                    <Truck size={9}/> {matDiff}д
                                </button>
                            )}
                            {order.paintDeadline && !order.paintArrived && (
                                <button onClick={() => window.confirm('Подтвердить прибытие краски?') && actions.updateOrder(order.id, 'paintArrived', true)}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold transition ${getCountdown(order.paintDeadline) < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                    <Droplet size={9}/> {getCountdown(order.paintDeadline)}д
                                </button>
                            )}
                        </div>
                    )}

                    {/* DIVIDER */}
                    {isAdmin && <div className="h-8 w-px bg-slate-200"></div>}

                    {/* GROUP 3: Complete Button */}
                    {isAdmin && (
                    <button
                        onClick={() => {
                            if (window.confirm('Завершить заказ и переместить на склад?')) {
                                actions.moveToShipping(order.id);
                            }
                        }}
                        className="p-1 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all shrink-0"
                        title="Завершить и переместить на склад"
                    >
                        <CheckCircle size={16} />
                    </button>
                    )}
                </div>

                {/* Desktop: Full Row Layout */}
                <div className="hidden sm:flex items-center w-full relative">
                    
                    {/* 1. ЛЕВАЯ ЧАСТЬ: Инфо о заказе */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                         {/* Expand Icon */}
                        <button className={`hidden md:block p-0.5 rounded-full transition-colors shrink-0 ${isExpanded ? 'bg-slate-200 text-slate-600' : 'text-slate-300'}`}>
                            {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>

                        {/* Settings */}
                        {isAdmin && (
                            <button onClick={(e) => onOpenSettings(order, e)} className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-slate-400 hover:text-orange-500 hover:rotate-90 transition-all duration-500 shadow-sm shrink-0 border border-slate-700">
                                <Settings size={12} />
                            </button>
                        )}

                        {/* Star */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.updateOrder(order.id, 'isImportant', !order.isImportant);
                            }}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all shadow-sm shrink-0 border ${
                                order.isImportant
                                    ? 'bg-amber-400 text-white border-amber-500 hover:bg-amber-500'
                                    : 'bg-white text-slate-300 border-slate-200 hover:border-amber-300 hover:text-amber-400'
                            }`}
                            title={order.isImportant ? 'Убрать из важных' : 'Отметить как важный'}
                        >
                            <Star size={12} className={`${order.isImportant ? 'fill-current' : ''}`} />
                        </button>

                        {/* Text Info */}
                        <div className="flex flex-col min-w-0 mr-2">
                            <div className="font-black text-sm text-slate-800 uppercase tracking-tight leading-none truncate">{order.orderNumber || 'БЕЗ НОМЕРА'}</div>
                            <div className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5 mt-0.5 truncate uppercase tracking-wider">
                                <User size={8} /> {order.clientName || 'Клиент не указан'}
                            </div>
                        </div>
                    </div>

                    {/* 2. ЦЕНТР: Поставки и Статус (Абсолютное позиционирование для симметрии) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-20" onClick={e => e.stopPropagation()}>

                        {/* Кнопки поставок (слева от статуса) */}
                        {isAdmin && <div className="flex items-center gap-1">
                    {order.drawingsDeadline && !order.drawingsArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие КМД?')) {
                                    actions.updateOrder(order.id, 'drawingsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-14 py-1 rounded border transition-all hover:scale-105 active:scale-95 ${
                                drawDiff < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[8px] font-black uppercase flex items-center gap-0.5"><PenTool size={8}/> КМД</div>
                            <div className="font-bold text-[10px] leading-none mt-0.5">{drawDiff < 0 ? `-${Math.abs(drawDiff)}` : (drawDiff === 0 ? 'Сегодня' : `${drawDiff}д`)}</div>
                        </button>
                    )}
                    {order.materialsDeadline && !order.materialsArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие материалов?')) {
                                    actions.updateOrder(order.id, 'materialsArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-14 py-1 rounded border transition-all hover:scale-105 active:scale-95 ${
                                matDiff < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[8px] font-black uppercase flex items-center gap-0.5"><Truck size={8}/> Металл</div>
                            <div className="font-bold text-[10px] leading-none mt-0.5">{matDiff < 0 ? `-${Math.abs(matDiff)}` : (matDiff === 0 ? 'Сегодня' : `${matDiff}д`)}</div>
                        </button>
                    )}
                    {order.paintDeadline && !order.paintArrived && (
                        <button
                            onClick={() => {
                                if (window.confirm('Подтвердить прибытие краски?')) {
                                    actions.updateOrder(order.id, 'paintArrived', true);
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-14 py-1 rounded border transition-all hover:scale-105 active:scale-95 ${
                                getCountdown(order.paintDeadline) < 0
                                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                            }`}
                            title="Нажмите для подтверждения прибытия"
                        >
                            <div className="text-[8px] font-black uppercase flex items-center gap-0.5"><Droplet size={8}/> Краска</div>
                            <div className="font-bold text-[10px] leading-none mt-0.5">
                                {getCountdown(order.paintDeadline) < 0
                                    ? `-${Math.abs(getCountdown(order.paintDeadline))}`
                                    : (getCountdown(order.paintDeadline) === 0 ? 'Сегодня' : `${getCountdown(order.paintDeadline)}д`)
                                }
                            </div>
                        </button>
                    )}
                        </div>}

                        {/* Статус (по центру) */}
                        <div className="relative">
                        <button onClick={isAdmin ? (e) => onToggleStatusMenu(order.id, e) : undefined} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 transition-all shadow-sm active:scale-95 ${currentStatus.color} ${!isAdmin && 'cursor-default active:scale-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">{currentStatus.label}</span>
                            <ChevronDown size={12}/>
                        </button>
                        {isStatusMenuOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white shadow-2xl rounded-xl p-2 z-[1000] border border-slate-200 animate-in zoom-in-95">
                                {ORDER_STATUSES.map(st => (
                                    <div key={st.id} onClick={() => { handleStatusChange(st.id); onToggleStatusMenu(order.id, { stopPropagation: () => {} }); }} className={`px-3 py-3 text-xs font-bold rounded-lg cursor-pointer hover:brightness-95 mb-1 last:mb-0 text-center uppercase tracking-wide border ${st.color}`}>
                                        {st.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isStatusMenuOpen && <div className="fixed inset-0 z-[999] bg-slate-900/30 backdrop-blur-sm" onClick={(e) => onToggleStatusMenu(order.id, e)}></div>}
                    </div>

                    </div>

                    {/* Заметки — между статусом и дедлайном */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowNotesModal(true); }}
                        className={`absolute right-[28%] top-1/2 -translate-y-1/2 rounded-lg transition-all z-30 ${hasNotes ? 'p-1 bg-white text-slate-900 shadow-md border-2 border-slate-800 hover:bg-slate-100' : 'p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                        title="Заметки"
                    >
                        <MessageSquare size={hasNotes ? 20 : 16} strokeWidth={hasNotes ? 2.5 : 2} />
                    </button>

                    {/* 3. ПРАВАЯ ЧАСТЬ: Дедлайн, Оплата, Завершить */}
                    <div className="flex items-center gap-2 justify-end flex-1 z-10" onClick={e => e.stopPropagation()}>

                        {/* Дедлайн */}
                        <div className="relative text-right">
                        <button className="flex flex-col items-end group outline-none" onClick={() => setShowDeadlineDetails(!showDeadlineDetails)}>
                            <div className={`text-2xl font-black leading-none transition-transform group-hover:scale-105 ${dlInfo.color}`}>{dlInfo.text || '—'}</div>
                            {order.deadline && (
                                <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 group-hover:text-slate-600 mt-0.5">
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
                        <div className="flex flex-col items-end px-1.5 border-r border-slate-200/50">
                             <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-0.5"><Wallet size={8} /> Оплата</span>
                             <span className="font-bold text-slate-700 text-xs">{order.paymentDate ? new Date(order.paymentDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) : '—'}</span>
                        </div>

                        {/* Завершить → перемещает в отгрузки */}
                        {isAdmin && (
                        <button
                            onClick={() => {
                                if (window.confirm('Завершить заказ и переместить на склад?')) {
                                    actions.moveToShipping(order.id);
                                }
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                            title="Завершить и переместить на склад"
                        >
                            <CheckCircle size={18} />
                        </button>
                        )}
                    </div>
                </div>
            </div>

            {/* МОДАЛКА ЗАМЕТОК */}
            {showNotesModal && (
                <NotesModal order={order} actions={actions} onClose={() => setShowNotesModal(false)} />
            )}

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

                    {/* УПРАВЛЕНИЕ ПОСТАВКАМИ - только для производственных заказов */}
                    {!order.isProductOrder && isAdmin && (order.drawingsDeadline || order.materialsDeadline || order.paintDeadline) && (
                        <div className="mt-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Поставки:</span>

                                {/* КМД */}
                                {order.drawingsDeadline && (
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer hover:shadow-md ${order.drawingsArrived ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'}`}>
                                        <input
                                            type="checkbox"
                                            checked={order.drawingsArrived || false}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (window.confirm('Подтвердить прибытие КМД?')) {
                                                        actions.updateOrder(order.id, 'drawingsArrived', true);
                                                    }
                                                } else {
                                                    actions.updateOrder(order.id, 'drawingsArrived', false);
                                                }
                                            }}
                                            className="w-4 h-4 rounded"
                                        />
                                        <PenTool size={12} />
                                        <span className="text-[11px] font-bold uppercase">КМД</span>
                                        <span className="text-[10px] font-mono opacity-80">{new Date(order.drawingsDeadline).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})}</span>
                                    </label>
                                )}

                                {/* Материалы */}
                                {order.materialsDeadline && (
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer hover:shadow-md ${order.materialsArrived ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'}`}>
                                        <input
                                            type="checkbox"
                                            checked={order.materialsArrived || false}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (window.confirm('Подтвердить прибытие материалов?')) {
                                                        actions.updateOrder(order.id, 'materialsArrived', true);
                                                    }
                                                } else {
                                                    actions.updateOrder(order.id, 'materialsArrived', false);
                                                }
                                            }}
                                            className="w-4 h-4 rounded"
                                        />
                                        <Truck size={12} />
                                        <span className="text-[11px] font-bold uppercase">Металл</span>
                                        <span className="text-[10px] font-mono opacity-80">{new Date(order.materialsDeadline).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})}</span>
                                    </label>
                                )}

                                {/* Краска */}
                                {order.paintDeadline && (
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer hover:shadow-md ${order.paintArrived ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'}`}>
                                        <input
                                            type="checkbox"
                                            checked={order.paintArrived || false}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (window.confirm('Подтвердить прибытие краски?')) {
                                                        actions.updateOrder(order.id, 'paintArrived', true);
                                                    }
                                                } else {
                                                    actions.updateOrder(order.id, 'paintArrived', false);
                                                }
                                            }}
                                            className="w-4 h-4 rounded"
                                        />
                                        <Droplet size={12} />
                                        <span className="text-[11px] font-bold uppercase">Краска</span>
                                        <span className="text-[10px] font-mono opacity-80">{new Date(order.paintDeadline).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})}</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* СЕКЦИЯ ЧЕРТЕЖЕЙ - только для производственных заказов */}
                    {!order.isProductOrder && (
                        <DrawingsSection
                            order={order}
                            actions={actions}
                            isAdmin={isAdmin}
                        />
                    )}

                    {/* КНОПКИ ДОБАВЛЕНИЯ */}
                    {isAdmin && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => onAddProduct(order)}
                            className={`${order.isProductOrder ? 'w-full' : 'flex-1'} px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg ${order.isProductOrder ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'} text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap`}
                        >
                            {order.isProductOrder ? <ShoppingBag size={14} strokeWidth={3} className="sm:w-4 sm:h-4 shrink-0" /> : <Plus size={14} strokeWidth={3} className="sm:w-4 sm:h-4 shrink-0" />}
                            <span className="uppercase tracking-wide">{order.isProductOrder ? 'Добавить товар' : 'Добавить изделие'}</span>
                        </button>

                        {/* Кнопка "Из архива" только для производственных заказов */}
                        {!order.isProductOrder && (
                            <button
                                onClick={() => onCopyFromArchive(order)}
                                className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
                            >
                                <Copy size={14} className="sm:w-4 sm:h-4 shrink-0" />
                                <span className="uppercase tracking-wide">Из архива</span>
                            </button>
                        )}
                    </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default OrderCard;