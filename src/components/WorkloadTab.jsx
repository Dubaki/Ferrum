import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

export default function WorkloadTab({ resources, globalTimeline, dailyAllocations }) {
  const [startDate, setStartDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState(null);

  const daysToShow = 14; 
  const dates = [];
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  const shiftDates = (days) => {
      const newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + days);
      setStartDate(newDate);
  };

  const getCellColor = (hours, maxHours) => {
      if (hours === 0) return ''; 
      const load = hours / maxHours;
      if (load < 0.5) return 'bg-emerald-100 text-emerald-800 font-bold'; 
      if (load < 0.9) return 'bg-blue-100 text-blue-800 font-bold';   
      if (load <= 1.0) return 'bg-indigo-200 text-indigo-900 font-bold'; 
      return 'bg-rose-200 text-rose-900 font-black animate-pulse'; // Перегрузка
  };

  const handleCellClick = (res, dateStr, booked) => {
      if (booked === 0) return;
      const tasks = dailyAllocations && dailyAllocations[res.id] && dailyAllocations[res.id][dateStr] 
        ? dailyAllocations[res.id][dateStr] 
        : [];
      setSelectedCell({
          resName: res.name,
          dateStr: new Date(dateStr).toLocaleDateString('ru-RU'),
          totalHours: booked,
          tasks: tasks
      });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-140px)] relative fade-in">
        
        {/* Шапка */}
        <div className="p-4 border-b-2 border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl z-20">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Calendar size={20} className="text-orange-600"/>
                График загрузки
            </h2>
            <div className="flex items-center gap-4">
                <button onClick={() => setStartDate(new Date())} className="text-xs font-bold text-indigo-600 hover:underline">
                    Сегодня
                </button>
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
                    <button onClick={() => shiftDates(-7)} className="p-1 hover:bg-slate-100 rounded transition text-slate-600"><ChevronLeft size={20}/></button>
                    <span className="font-bold text-xs w-28 text-center text-slate-700 font-mono">
                        {dates[0].toLocaleDateString()} - {dates[dates.length-1].toLocaleDateString()}
                    </span>
                    <button onClick={() => shiftDates(7)} className="p-1 hover:bg-slate-100 rounded transition text-slate-600"><ChevronRight size={20}/></button>
                </div>
            </div>
        </div>

        {/* Таблица (Инженерный стиль) */}
        <div className="overflow-auto flex-1 custom-scrollbar bg-slate-100 p-4">
            <table className="w-full border-collapse bg-white shadow-sm text-sm">
                <thead className="sticky top-0 z-20">
                    <tr>
                        <th className="p-3 text-left border-2 border-slate-300 bg-slate-200 min-w-[200px] text-xs font-black text-slate-600 uppercase tracking-wider sticky left-0 z-30 shadow-md">
                            Сотрудник
                        </th>
                        {dates.map((date, idx) => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <th key={idx} className={`p-2 text-center border-2 border-slate-300 min-w-[60px] ${isWeekend ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                    <div className="text-[10px] font-bold uppercase opacity-70">{date.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                                    <div className="text-sm font-black">
                                        {date.getDate()}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {resources.map((res, rowIndex) => (
                        <tr key={res.id} className="hover:bg-yellow-50 transition-colors">
                            {/* Колонка имен (Sticky) */}
                            <td className="p-3 border-2 border-slate-300 bg-white sticky left-0 z-10 font-bold text-slate-800 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {res.name}
                                <div className="text-[10px] text-slate-400 font-normal">{res.position}</div>
                            </td>
                            
                            {/* Ячейки дней */}
                            {dates.map((date, idx) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const booked = globalTimeline[res.id] && globalTimeline[res.id][dateStr] 
                                    ? globalTimeline[res.id][dateStr] 
                                    : 0;
                                
                                const maxHours = (res.scheduleOverrides && res.scheduleOverrides[dateStr] !== undefined) 
                                    ? res.scheduleOverrides[dateStr] 
                                    : res.hoursPerDay;
                                
                                const cellClass = getCellColor(booked, maxHours);
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                return (
                                    <td 
                                        key={idx} 
                                        className={`p-0 border-2 border-slate-300 text-center relative ${isWeekend ? 'bg-rose-50/40 pattern-diagonal-lines' : ''}`}
                                        onClick={() => handleCellClick(res, dateStr, booked)}
                                    >
                                        <div className={`w-full h-12 flex items-center justify-center text-xs transition-all ${booked > 0 ? 'cursor-pointer hover:opacity-80' : ''} ${cellClass}`}>
                                            {booked > 0 ? booked.toFixed(1) : ''}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* --- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ --- */}
        {selectedCell && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{selectedCell.resName}</h3>
                            <p className="text-xs text-slate-300">{selectedCell.dateStr} — Загрузка: {selectedCell.totalHours} ч</p>
                        </div>
                        <button onClick={() => setSelectedCell(null)} className="text-white/70 hover:text-white transition">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-3">
                            {selectedCell.tasks.map((task, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{task.productName}</div>
                                        <div className="text-xs text-indigo-600 font-medium">{task.name}</div>
                                        {task.orderNumber && <div className="text-[10px] text-slate-400">Заказ {task.orderNumber}</div>}
                                    </div>
                                    <div className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-sm">
                                        {task.hours.toFixed(1)} ч
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-slate-50 text-center border-t border-slate-200">
                        <button onClick={() => setSelectedCell(null)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition">
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}