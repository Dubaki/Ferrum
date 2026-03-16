import React, { useMemo } from 'react';
import { Clock, ChevronDown, ChevronRight, Folder, Package, Anchor, FileText, PenTool, Truck, Flag, Star, Droplet, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SHOP_STAGE_COLORS } from '../../utils/constants';


const COL_WIDTH = 48;
const SIDEBAR_WIDTH = 320;
const ROW_HEIGHT = 50;

function GanttChart({ calendarDays, rows, startDate, expandedIds, onToggleExpand, onItemClick, onProductNameClick }) {

    // Собираем плоский список для рендера
    const visibleItems = useMemo(() => {
        const items = [];
        rows.forEach(order => {
            items.push(order);
            if (expandedIds.includes(order.id)) {
                if (order.children) {
                    order.children.forEach(child => items.push(child));
                }
            }
        });
        return items;
    }, [rows, expandedIds]);

    const normalizeDate = (d) => {
        if (!d) return new Date();
        const date = new Date(d);
        if (isNaN(date.getTime())) return new Date();
        if (typeof d === 'string' && d.length === 10) {
            return new Date(d + 'T00:00:00');
        }
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    };

    const chartStartDate = useMemo(() => normalizeDate(startDate), [startDate]);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0,0,0,0);
        return d;
    }, []);

    const todayIndex = useMemo(() => calendarDays.findIndex(day => {
        const d = new Date(day);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    }), [calendarDays, today]);

    const todayLineLeft = todayIndex !== -1 ? SIDEBAR_WIDTH + (todayIndex * COL_WIDTH) + (COL_WIDTH / 2) : -1;

    const getBarStyles = (item) => {
        const itemStart = normalizeDate(item.startDate);
        const startOffset = Math.round((itemStart - chartStartDate) / (1000 * 60 * 60 * 24));
        
        if(isNaN(startOffset)) return { display: 'none' };

        const duration = item.durationDays || 1;
        const left = startOffset * COL_WIDTH;
        const width = duration * COL_WIDTH;
        const isOrder = item.type === 'order';

        // ПРИОРИТЕТ ЦВЕТА: 1. ГОТОВО (Зеленый)
        if (item.isCompleted) {
            return {
                left: `${left}px`,
                width: `${width}px`,
                className: `absolute top-[10px] h-8 rounded-xl flex items-center px-3 text-white text-xs font-bold whitespace-nowrap overflow-hidden transition-all hover:scale-105 hover:shadow-xl cursor-pointer bg-emerald-500 z-10 shadow-sm border border-white/20`,
                style: {}
            };
        }

        // 2. ДЛЯ ЗАКАЗОВ (Статусы обеспечения или дедлайны)
        if (isOrder) {
            let bgClass = 'bg-gradient-to-r from-indigo-500 to-indigo-600';
            if (item.customStatus === 'metal') bgClass = 'bg-slate-400';
            else if (item.customStatus === 'drawings') bgClass = 'bg-slate-500';
            else if (item.deadline) {
                const daysLeft = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 0) bgClass = 'bg-gradient-to-r from-red-500 to-rose-600';
                else if (daysLeft <= 3) bgClass = 'bg-gradient-to-r from-orange-500 to-amber-600';
                else if (daysLeft <= 10) bgClass = 'bg-gradient-to-r from-yellow-400 to-amber-500';
                else bgClass = 'bg-gradient-to-r from-emerald-500 to-teal-600';
            }
            return {
                left: `${left}px`,
                width: `${width}px`,
                className: `absolute top-[10px] h-8 rounded-xl flex items-center px-3 text-white text-xs font-bold whitespace-nowrap overflow-hidden transition-all hover:scale-105 hover:shadow-xl cursor-pointer ${bgClass} z-10 shadow-sm`,
                style: {}
            };
        }

        // 3. ДЛЯ ИЗДЕЛИЙ (Этапы цеха)
        let bgClass = 'bg-gradient-to-r from-slate-400 to-slate-500';
        let customStyle = {};
        if (item.isResale) bgClass = 'bg-gradient-to-r from-cyan-500 to-blue-500';
        else if (item.shopStage && SHOP_STAGE_COLORS[item.shopStage]) {
            customStyle = { backgroundColor: SHOP_STAGE_COLORS[item.shopStage] };
            bgClass = ''; 
        }

        return {
            left: `${left}px`,
            width: `${width}px`,
            className: `absolute top-[10px] h-8 rounded-xl flex items-center px-3 text-white text-xs font-bold whitespace-nowrap overflow-hidden transition-all hover:scale-105 hover:shadow-xl cursor-pointer ${bgClass} z-10 shadow-sm`,
            style: customStyle
        };
    };

    const getStatusIcon = (item) => {
        if (item.isCompleted) return <CheckCircle2 size={14} className="text-white" />;
        if (item.type === 'order') {
            switch(item.customStatus) {
                case 'metal': return <Anchor size={14} className="text-red-200" />;
                case 'components': return <Package size={14} className="text-orange-200" />;
                case 'drawings': return <FileText size={14} className="text-yellow-200" />;
                case 'work': return <Clock size={14} className="text-emerald-200 animate-spin" />;
                default: return <Folder size={14} className="opacity-80"/>;
            }
        }
        return <Clock size={12} className="opacity-80" />;
    };

    const getMarkerPosition = (dateStr) => {
        if (!dateStr) return null;
        const offset = Math.round((normalizeDate(dateStr) - chartStartDate) / (1000 * 60 * 60 * 24));
        if (offset < 0) return null;
        return offset * COL_WIDTH + (COL_WIDTH / 2) - 8;
    };

    return (
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white h-full">
            <div style={{ width: SIDEBAR_WIDTH + (calendarDays.length * COL_WIDTH), minHeight: '100%' }}>

                <div className="flex h-12 sticky top-0 z-[100] bg-slate-100 border-b-2 border-slate-300 shadow-sm">
                    <div
                        className="sticky left-0 z-[101] bg-slate-200 border-r-2 border-slate-300 flex items-center px-4 font-black text-xs text-slate-700 uppercase tracking-widest"
                        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                    >
                        Заказ / Клиент / Срок
                    </div>
                    {calendarDays.map((day, i) => {
                        const d = normalizeDate(day);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday = today.getTime() === d.getTime();
                        return (
                            <div key={i}
                                className={`flex-shrink-0 border-r border-slate-300 flex flex-col items-center justify-center text-[10px] uppercase font-bold transition-colors
                                    ${isToday ? 'bg-blue-100 text-blue-800 border-blue-300' : isWeekend ? 'bg-rose-50 text-rose-600' : 'text-slate-600'}
                                `}
                                style={{ width: COL_WIDTH }}
                            >
                                <span>{d.getDate()}</span>
                                <span className="opacity-70">{d.toLocaleDateString('ru-RU', {weekday:'short'})}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="relative pb-24">
                    {todayLineLeft !== -1 && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none" style={{ left: todayLineLeft }}></div>
                    )}

                    <div className="absolute inset-0 flex pointer-events-none" style={{ left: SIDEBAR_WIDTH }}>
                        {calendarDays.map((day, i) => {
                            const isWeekend = normalizeDate(day).getDay() === 0 || normalizeDate(day).getDay() === 6;
                            return (
                                <div key={i} className={`h-full border-r border-slate-200 ${isWeekend ? 'bg-rose-50/20' : ''}`} style={{width: COL_WIDTH}}></div>
                            );
                        })}
                    </div>

                    {visibleItems.map((item) => {
                        const isOrder = item.type === 'order';
                        const isCompleted = item.isCompleted;
                        const bar = getBarStyles(item);

                        const drawLeft = isOrder && item.drawingsDeadline ? getMarkerPosition(item.drawingsDeadline) : null;
                        const matLeft = isOrder && item.materialsDeadline ? getMarkerPosition(item.materialsDeadline) : null;
                        const paintLeft = isOrder && item.paintDeadline ? getMarkerPosition(item.paintDeadline) : null;
                        const deadlineLeft = isOrder && item.deadline ? getMarkerPosition(item.deadline) : null;

                        const isImportant = isOrder && item.isImportant;
                        
                        let rowBg = 'bg-white';
                        if (isCompleted) rowBg = 'bg-emerald-50/60';
                        else if (isImportant) rowBg = 'bg-amber-50/80';
                        else if (!isOrder) rowBg = 'bg-slate-50/40';

                        return (
                            <div key={item.id} className={`flex border-b border-slate-200 ${rowBg} hover:bg-slate-100 transition-colors relative group`} style={{ height: ROW_HEIGHT }}>

                                <div
                                    className={`sticky left-0 z-30 border-r-2 border-slate-200 flex items-center px-2 cursor-pointer shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-colors ${
                                        isCompleted ? 'bg-emerald-50 group-hover:bg-emerald-100' :
                                        isImportant ? 'bg-amber-50 group-hover:bg-amber-100' : 
                                        'bg-white group-hover:bg-slate-50'
                                    }`}
                                    style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                                    onClick={() => isOrder ? onToggleExpand(item.id) : onProductNameClick && onProductNameClick(item)}
                                >
                                    {isImportant && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>}
                                    {isCompleted && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>}
                                    
                                    {isOrder ? (
                                        <div className="flex items-center w-full pl-3 gap-2">
                                            <div className="text-slate-400">
                                                {expandedIds.includes(item.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            </div>

                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        {isImportant && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                                                        <span className={`font-black text-sm truncate uppercase ${isCompleted ? 'text-emerald-800' : 'text-slate-800'}`}>{item.orderNumber}</span>
                                                    </div>
                                                    {isCompleted && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate font-medium">{item.clientName || 'Без клиента'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center w-full pl-10 pr-2 gap-2">
                                            {isCompleted ? (
                                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                            ) : item.isResale ? (
                                                <ShoppingBag size={14} className="text-cyan-600 shrink-0" />
                                            ) : (
                                                <Package size={14} className="text-slate-400 shrink-0" />
                                            )}
                                            <div className={`truncate text-xs font-bold flex-1 ${isCompleted ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                {item.name}
                                            </div>
                                            <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isCompleted ? 'bg-emerald-200 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                                                ×{item.quantity}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 relative">
                                    {calendarDays.map((day, i) => (
                                        <div
                                            key={`grid-${item.id}-${i}`}
                                            className={`absolute top-0 bottom-0 border-r border-slate-200 pointer-events-none ${normalizeDate(day).getDay()===0||normalizeDate(day).getDay()===6 ? 'bg-rose-50/10' : ''}`}
                                            style={{ left: i * COL_WIDTH, width: COL_WIDTH }}
                                        ></div>
                                    ))}

                                    {drawLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30" style={{ left: drawLeft }} title="КМД">
                                            <div className="w-6 h-6 bg-indigo-100 border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-700 shadow-sm"><PenTool size={12}/></div>
                                        </div>
                                    )}
                                    {matLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30" style={{ left: matLeft }} title="Металл">
                                            <div className="w-6 h-6 bg-orange-100 border-2 border-orange-500 rounded-full flex items-center justify-center text-orange-700 shadow-sm"><Truck size={12}/></div>
                                        </div>
                                    )}
                                    {paintLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30" style={{ left: paintLeft }} title="Краска">
                                            <div className="w-6 h-6 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-700 shadow-sm"><Droplet size={12}/></div>
                                        </div>
                                    )}

                                    <div
                                        style={{ left: bar.left, width: bar.width, ...bar.style }}
                                        className={bar.className}
                                        onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                    >
                                        <span className="relative drop-shadow-md pointer-events-none flex items-center gap-1.5 pl-1 w-full overflow-hidden">
                                            {getStatusIcon(item)}
                                            <span className="truncate font-bold flex-1">
                                                {item.totalHours} ч {isCompleted && <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded ml-1 uppercase">Готово</span>}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default React.memo(GanttChart);