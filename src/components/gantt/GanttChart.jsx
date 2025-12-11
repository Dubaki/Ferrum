import React from 'react';
import { Clock, ChevronDown, ChevronRight, Folder, Package, Anchor, FileText, AlertOctagon, PenTool, Truck } from 'lucide-react';
import Heatmap from './Heatmap';

const COL_WIDTH = 48;
const SIDEBAR_WIDTH = 320;
const ROW_HEIGHT = 50;

export default function GanttChart({ calendarDays, rows, startDate, expandedIds, onToggleExpand, onItemClick, heatmapData }) {
    
    // Собираем плоский список для рендера
    const visibleItems = [];
    rows.forEach(order => {
        visibleItems.push(order);
        if (expandedIds.includes(order.id)) {
            order.children.forEach(child => visibleItems.push(child));
        }
    });

    const getBarStyles = (item) => {
        const startOffset = Math.ceil((new Date(item.startDate) - startDate) / (1000 * 60 * 60 * 24));
        if(isNaN(startOffset)) return { display: 'none' };

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
            bgClass = 'bg-gradient-to-r from-slate-400 to-slate-500';
        }

        return {
            left: `${left}px`,
            width: `${width}px`,
            className: `absolute top-[10px] h-8 rounded-xl flex items-center px-3 text-white text-xs font-bold whitespace-nowrap overflow-hidden transition-all hover:scale-105 hover:shadow-xl cursor-pointer ${bgClass} z-10`,
            pattern: pattern || !isOrder
        };
    };

    const getUrgencyColor = (deadline) => {
        if (!deadline) return 'bg-slate-300';
        const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'bg-red-600 animate-pulse';
        if (days <= 3) return 'bg-orange-500';
        if (days <= 7) return 'bg-yellow-400';
        return 'bg-emerald-500';
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
        const offset = Math.ceil((new Date(dateStr) - startDate) / (1000 * 60 * 60 * 24));
        if (offset < 0) return null; 
        return offset * COL_WIDTH + (COL_WIDTH / 2) - 8;
    };

    return (
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white h-full">
            <div style={{ width: SIDEBAR_WIDTH + (calendarDays.length * COL_WIDTH), minHeight: '100%' }}>
                
                {/* 1. ШАПКА */}
                <div className="flex h-12 sticky top-0 z-40 bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-300 shadow-sm">
                    <div 
                        className="sticky left-0 z-50 bg-slate-200 border-r-2 border-slate-300 flex items-center px-4 font-black text-xs text-slate-700 uppercase tracking-widest"
                        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                    >
                        Заказ / Клиент / Срок
                    </div>
                    {calendarDays.map((day, i) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isToday = new Date().toDateString() === day.toDateString();
                        return (
                            <div key={i} 
                                className={`flex-shrink-0 border-r border-slate-200 flex flex-col items-center justify-center text-[10px] uppercase font-bold transition-colors
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
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none" style={{ left: SIDEBAR_WIDTH + (3 * COL_WIDTH) + (COL_WIDTH/2) }}></div>

                    <div className="absolute inset-0 flex pointer-events-none" style={{ left: SIDEBAR_WIDTH }}>
                        {calendarDays.map((d, i) => (<div key={i} className={`h-full border-r border-slate-100 ${d.getDay()===0||d.getDay()===6?'bg-rose-50/30':''}`} style={{width: COL_WIDTH}}></div>))}
                    </div>

                    {visibleItems.map((item) => {
                        const isOrder = item.type === 'order';
                        const bar = getBarStyles(item);
                        
                        const drawLeft = isOrder ? getMarkerPosition(item.drawingsDeadline) : null;
                        const matLeft = isOrder ? getMarkerPosition(item.materialsDeadline) : null;

                        return (
                            <div key={item.id} className={`flex border-b border-slate-200 ${isOrder ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-50 transition-colors relative group`} style={{ height: ROW_HEIGHT }}>
                                
                                <div 
                                    className="sticky left-0 z-20 bg-white border-r-2 border-slate-200 flex items-center px-2 cursor-pointer shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] group-hover:bg-slate-50 overflow-hidden transition-colors"
                                    style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                                    onClick={() => isOrder ? onToggleExpand(item.id) : null}
                                >
                                    {isOrder ? (
                                        <div className="flex items-center w-full pl-3 gap-2">
                                            <button className="p-1.5 mr-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors">
                                                {expandedIds.includes(item.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            </button>
                                            
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="font-black text-sm text-slate-800 truncate uppercase" title={item.orderNumber}>{item.orderNumber}</span>
                                                    {item.customStatus === 'metal' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Ждем металл"></span>}
                                                    {item.customStatus === 'drawings' && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Ждем чертежи"></span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate font-medium">{item.clientName || 'Без клиента'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center w-full pl-10 pr-2 gap-2">
                                            <Package size={14} className="text-slate-400 shrink-0" />
                                            <div className="truncate text-xs font-semibold text-slate-600 flex-1">{item.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">×{item.quantity}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 relative">
                                    {drawLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center group/marker" style={{ left: drawLeft }} title={`КМД: ${new Date(item.drawingsDeadline).toLocaleDateString()}`}>
                                            <div className="w-0.5 h-full bg-indigo-300 absolute -top-10 bottom-0 pointer-events-none opacity-50 border-l border-dashed border-indigo-400"></div>
                                            <div className="w-6 h-6 bg-indigo-100 border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-700 shadow-sm z-10 relative hover:scale-125 transition-transform"><PenTool size={12}/></div>
                                        </div>
                                    )}

                                    {matLeft !== null && (
                                        <div className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center group/marker" style={{ left: matLeft }} title={`Металл: ${new Date(item.materialsDeadline).toLocaleDateString()}`}>
                                            <div className="w-0.5 h-full bg-rose-300 absolute -top-10 bottom-0 pointer-events-none opacity-50 border-l border-dashed border-rose-400"></div>
                                            <div className="w-6 h-6 bg-rose-100 border-2 border-rose-500 rounded-full flex items-center justify-center text-rose-700 shadow-sm z-10 relative hover:scale-125 transition-transform"><Truck size={12}/></div>
                                        </div>
                                    )}

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
                <div className="sticky bottom-0 z-30 flex h-16 bg-white border-t-2 border-slate-400 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <div className="sticky left-0 z-40 bg-gradient-to-br from-slate-100 to-slate-50 border-r-2 border-slate-300 flex flex-col items-center justify-center font-black text-xs text-slate-500 uppercase tracking-widest px-4" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                        <div>Загрузка</div>
                        <div className="text-[10px] opacity-70">цеха</div>
                    </div>
                    <Heatmap calendarDays={calendarDays} heatmapData={heatmapData} />
                </div>

            </div>
        </div>
    );
}