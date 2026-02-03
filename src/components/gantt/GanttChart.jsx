import React, { useMemo } from 'react';
import { Clock, ChevronDown, ChevronRight, Folder, Package, Anchor, FileText, PenTool, Truck, Flag, Star, Droplet, ShoppingBag } from 'lucide-react';
import Heatmap from './Heatmap';

const COL_WIDTH = 48;
const SIDEBAR_WIDTH = 320;
const ROW_HEIGHT = 50;

function GanttChart({ calendarDays, rows, startDate, expandedIds, onToggleExpand, onItemClick, onProductNameClick, heatmapData }) {

    // Собираем плоский список для рендера - ОПТИМИЗИРОВАНО с useMemo
    const visibleItems = useMemo(() => {
        const items = [];
        rows.forEach(order => {
            items.push(order);
            if (expandedIds.includes(order.id)) {
                order.children.forEach(child => items.push(child));
            }
        });
        return items;
    }, [rows, expandedIds]);

    // Хелпер для нормализации даты (сброс времени), чтобы избежать смещений
    const normalizeDate = (d) => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getBarStyles = (item) => {
        const startOffset = Math.round((normalizeDate(item.startDate) - normalizeDate(startDate)) / (1000 * 60 * 60 * 24));
        if(isNaN(startOffset)) return { display: 'none' };

        // ИСПРАВЛЕНИЕ: Используем календарную длительность для ширины
        // Теперь если задача 5 смен попадает на выходные, она займет 7 клеток
        const duration = item.durationDays || 1;

        const left = startOffset * COL_WIDTH;
        const width = duration * COL_WIDTH;
        const isOrder = item.type === 'order';

        let bgClass = 'bg-gradient-to-r from-indigo-500 to-indigo-600';
        let pattern = false;

        if (isOrder) {
            if (item.customStatus === 'metal') {
                bgClass = 'bg-slate-400';
                pattern = true;
            } else if (item.customStatus === 'drawings') {
                bgClass = 'bg-slate-500';
                pattern = true;
            } else if (item.deadline) {
                const daysLeft = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 0) bgClass = 'bg-gradient-to-r from-red-500 to-rose-600';
                else if (daysLeft <= 3) bgClass = 'bg-gradient-to-r from-orange-500 to-amber-600';
                else if (daysLeft <= 10) bgClass = 'bg-gradient-to-r from-yellow-400 to-amber-500';
                else bgClass = 'bg-gradient-to-r from-emerald-500 to-teal-600';
            }
        } else {
            if (item.isResale) {
                bgClass = 'bg-gradient-to-r from-cyan-500 to-blue-500'; // Цвет для перепродажи
            } else {
                bgClass = 'bg-gradient-to-r from-slate-400 to-slate-500';
            }
        }

        return {
            left: `${left}px`,
            width: `${width}px`,
            className: `absolute top-[10px] h-8 rounded-xl flex items-center px-3 text-white text-xs font-bold whitespace-nowrap overflow-hidden transition-all hover:scale-105 hover:shadow-xl cursor-pointer ${bgClass} z-10`,
            pattern: pattern || !isOrder
        };
    };

    const getStatusIcon = (statusId) => {
        switch(statusId) {
            case 'metal': return <Anchor size={14} className="text-red-200" />;
            case 'components': return <Package size={14} className="text-orange-200" />;
            case 'drawings': return <FileText size={14} className="text-yellow-200" />;
            case 'work': return <Clock size={14} className="text-emerald-200 animate-spin-slow" />;
            default: return <Folder size={14} className="opacity-80"/>;
        }
    };

    const getMarkerPosition = (dateStr) => {
        if (!dateStr) return null;
        const offset = Math.round((normalizeDate(dateStr) - normalizeDate(startDate)) / (1000 * 60 * 60 * 24));
        if (offset < 0) return null;
        return offset * COL_WIDTH + (COL_WIDTH / 2) - 8;
    };

    return (
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white h-full">
            <div style={{ width: SIDEBAR_WIDTH + (calendarDays.length * COL_WIDTH), minHeight: '100%' }}>

                {/* 1. ШАПКА */}
                <div className="flex h-12 sticky top-0 z-[100] bg-slate-100 border-b-2 border-slate-300 shadow-sm">
                    <div
                        className="sticky left-0 z-[101] bg-slate-200 border-r-2 border-slate-300 flex items-center px-4 font-black text-xs text-slate-700 uppercase tracking-widest"
                        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                    >
                        Заказ / Клиент / Срок
                    </div>
                    {calendarDays.map((day, i) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isToday = new Date().toDateString() === day.toDateString();
                        return (
                            <div key={i}
                                className={`flex-shrink-0 border-r border-slate-300 flex flex-col items-center justify-center text-[10px] uppercase font-bold transition-colors
                                    ${isToday ? 'bg-blue-100 text-blue-800 border-blue-300' : isWeekend ? 'bg-rose-50 text-rose-600' : 'text-slate-600'}
                                `}
                                style={{ width: COL_WIDTH }}
                            >
                                <span>{day.getDate()}</span>
                                <span className="opacity-70">{day.toLocaleDateString('ru-RU', {weekday:'short'})}</span>
                            </div>
                        );
                    })}
                </div>

                {/* 2. КОНТЕНТ */}
                <div className="relative pb-24">
                    {/* Линия сегодня */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none" style={{ left: SIDEBAR_WIDTH + (3 * COL_WIDTH) + (COL_WIDTH/2) }}></div>

                    {/* Сетка и выходные */}
                    <div className="absolute inset-0 flex pointer-events-none" style={{ left: SIDEBAR_WIDTH }}>
                        {calendarDays.map((d, i) => (
                            <div key={i} className={`h-full border-r border-slate-300/50 ${d.getDay()===0||d.getDay()===6 ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxwYXRoIGQ9Ik0xIDNMMCA0TDMgMkw0IDN6IiBmaWxsPSIjZmRhNGE1IiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==")] bg-rose-50/20' : ''}`} style={{width: COL_WIDTH}}></div>
                        ))}
                    </div>

                    {visibleItems.map((item) => {
                        const isOrder = item.type === 'order';
                        const bar = getBarStyles(item);

                        // Маркеры показываются если дата установлена
                        const drawLeft = isOrder && item.drawingsDeadline ? getMarkerPosition(item.drawingsDeadline) : null;
                        const matLeft = isOrder && item.materialsDeadline ? getMarkerPosition(item.materialsDeadline) : null;
                        const paintLeft = isOrder && item.paintDeadline ? getMarkerPosition(item.paintDeadline) : null;
                        const deadlineLeft = isOrder && item.deadline ? getMarkerPosition(item.deadline) : null;

                        // Подсветка важного заказа
                        const isImportant = isOrder && item.isImportant;
                        const rowBg = isImportant
                            ? 'bg-gradient-to-r from-amber-200 via-amber-100 to-amber-50 border-l-[8px] border-l-amber-500 shadow-[inset_0_0_20px_rgba(251,191,36,0.3)]'
                            : (isOrder ? 'bg-white' : 'bg-slate-50');

                        return (
                            <div key={item.id} className={`flex border-b-2 border-slate-300 ${rowBg} hover:bg-slate-100 transition-colors relative group`} style={{ height: ROW_HEIGHT }}>

                                <div
                                    className={`sticky left-0 z-30 border-r-2 border-slate-200 flex items-center px-2 cursor-pointer shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] overflow-hidden transition-colors ${
                                        isImportant ? 'bg-amber-100/80 group-hover:bg-amber-100' : 'bg-white group-hover:bg-slate-50'
                                    }`}
                                    style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                                    onClick={() => isOrder ? onToggleExpand(item.id) : onProductNameClick && onProductNameClick(item)}
                                >
                                    {isOrder ? (
                                        <div className="flex items-center w-full pl-3 gap-2">
                                            <button className="p-1.5 mr-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors">
                                                {expandedIds.includes(item.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            </button>

                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        {isImportant && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 animate-pulse" />}
                                                        <span className="font-black text-sm text-slate-800 truncate uppercase" title={item.orderNumber}>{item.orderNumber}</span>
                                                    </div>
                                                    {item.customStatus === 'metal' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Ждем металл"></span>}
                                                    {item.customStatus === 'drawings' && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Ждем чертежи"></span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate font-medium">{item.clientName || 'Без клиента'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center w-full pl-10 pr-2 gap-2 hover:bg-blue-50 rounded transition-colors">
                                            {item.isResale ? (
                                                <ShoppingBag size={14} className="text-cyan-600 shrink-0" />
                                            ) : (
                                                <Package size={14} className="text-slate-400 shrink-0" />
                                            )}
                                            <div className="truncate text-xs font-semibold text-slate-600 flex-1">{item.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">×{item.quantity}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 relative">
                                    {/* Маркеры */}
                                    {drawLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center group/marker" style={{ left: drawLeft }} title={`КМД: ${new Date(item.drawingsDeadline).toLocaleDateString()}`}>
                                            <div className="w-0.5 h-full bg-indigo-300 absolute -top-10 bottom-0 pointer-events-none opacity-50 border-l border-dashed border-indigo-400"></div>
                                            <div className="w-6 h-6 bg-indigo-100 border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-700 shadow-sm z-10 relative hover:scale-125 transition-transform"><PenTool size={12}/></div>
                                        </div>
                                    )}

                                    {matLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center group/marker" style={{ left: matLeft }} title={`Металл: ${new Date(item.materialsDeadline).toLocaleDateString()}`}>
                                            <div className="w-0.5 h-full bg-orange-300 absolute -top-10 bottom-0 pointer-events-none opacity-50 border-l border-dashed border-orange-400"></div>
                                            <div className="w-6 h-6 bg-orange-100 border-2 border-orange-500 rounded-full flex items-center justify-center text-orange-700 shadow-sm z-10 relative hover:scale-125 transition-transform"><Truck size={12}/></div>
                                        </div>
                                    )}

                                    {paintLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center group/marker" style={{ left: paintLeft }} title={`Краска: ${new Date(item.paintDeadline).toLocaleDateString()}`}>
                                            <div className="w-0.5 h-full bg-emerald-300 absolute -top-10 bottom-0 pointer-events-none opacity-50 border-l border-dashed border-emerald-400"></div>
                                            <div className="w-6 h-6 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-700 shadow-sm z-10 relative hover:scale-125 transition-transform"><Droplet size={12}/></div>
                                        </div>
                                    )}

                                    {/* DEADLINE - Красная линия с флажком */}
                                    {deadlineLeft !== null && (
                                        <div className="absolute top-0 bottom-0 z-40 flex flex-col items-center pointer-events-none" style={{ left: deadlineLeft }}>
                                            {/* Красная линия */}
                                            <div className="w-0.5 h-full bg-red-500 absolute top-0 bottom-0 opacity-70"></div>
                                            {/* Флажок */}
                                            <div
                                                className="absolute -top-1 pointer-events-auto"
                                                title={`КРАЙНИЙ СРОК: ${new Date(item.deadline).toLocaleDateString('ru-RU')}`}
                                                style={{ transform: 'translateX(-50%)' }}
                                            >
                                                <div className="bg-red-500 text-white px-1 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                                                    <Flag size={8} className="fill-current" />
                                                    <span className="text-[8px] font-bold whitespace-nowrap leading-none">
                                                        {new Date(item.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Полоска Ганта */}
                                    <div
                                        style={{ left: bar.left, width: bar.width }}
                                        className={bar.className}
                                        onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                    >
                                        {bar.pattern && <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDhMODIDMEM1LjUgMS41IDQuNSAyLjUgOCAzVjZMMCAtMkw4IDZ6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')]"></div>}
                                        <span className="relative drop-shadow-md pointer-events-none flex items-center gap-1.5 pl-1">
                                            {isOrder ? getStatusIcon(item.customStatus) : <Clock size={12} className="opacity-80" />}
                                            <span className="truncate font-bold">
                                                {isOrder && item.customStatus === 'metal' ? 'ЖДЕМ МЕТАЛЛ' : (item.totalHours + ' ч')}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 3. ПОДВАЛ (HEATMAP) */}
                <div className="sticky bottom-0 z-[100] flex h-16 bg-white border-t-2 border-slate-400 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <div className="sticky left-0 z-[101] bg-gradient-to-br from-slate-100 to-slate-50 border-r-2 border-slate-300 flex flex-col items-center justify-center font-black text-xs text-slate-500 uppercase tracking-widest px-4" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                        <div>Загрузка</div>
                        <div className="text-[10px] opacity-70">цеха</div>
                    </div>
                    <Heatmap calendarDays={calendarDays} heatmapData={heatmapData} />
                </div>

            </div>
        </div>
    );
}

// Мемоизация компонента для предотвращения лишних перерисовок
export default React.memo(GanttChart);
