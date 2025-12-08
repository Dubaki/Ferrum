import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react';

export default function WorkloadTab({ resources, globalTimeline, dailyAllocations }) {
  const [startDate, setStartDate] = useState(new Date());
  
  // Состояние модального окна: { resName: 'Ivan', date: '...', tasks: [] }
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
      if (hours === 0) return 'bg-white';
      const load = hours / maxHours;
      if (load < 0.5) return 'bg-green-100 text-green-800'; 
      if (load < 0.9) return 'bg-blue-100 text-blue-800';   
      if (load <= 1.0) return 'bg-blue-200 text-blue-900 font-bold'; 
      return 'bg-red-200 text-red-900 font-bold'; 
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
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-[calc(100vh-140px)] relative">
        
        {/* Шапка */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-lg text-gray-700 flex items-center gap-2">
                <User size={20} />
                Плановая загрузка
            </h2>
            <div className="flex items-center gap-4">
                <button onClick={() => setStartDate(new Date())} className="text-xs font-bold text-blue-600 hover:underline">
                    Сегодня
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => shiftDates(-7)} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft /></button>
                    <span className="font-medium text-sm w-32 text-center">
                        {dates[0].toLocaleDateString()} - {dates[dates.length-1].toLocaleDateString()}
                    </span>
                    <button onClick={() => shiftDates(7)} className="p-1 hover:bg-gray-200 rounded"><ChevronRight /></button>
                </div>
            </div>
        </div>

        {/* Таблица */}
        <div className="overflow-auto flex-1">
            <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 text-left border-b border-r border-gray-200 min-w-[200px] text-xs font-bold text-gray-500 uppercase">
                            Сотрудник
                        </th>
                        {dates.map((date, idx) => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <th key={idx} className={`p-2 text-center border-b border-gray-200 min-w-[50px] ${isWeekend ? 'bg-gray-200/50' : ''}`}>
                                    <div className="text-xs text-gray-400 font-normal">{date.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                                    <div className={`text-sm font-bold ${isWeekend ? 'text-red-400' : 'text-gray-700'}`}>
                                        {date.getDate()}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {resources.map(res => (
                        <tr key={res.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 border-b border-r border-gray-200">
                                <div className="font-bold text-gray-800 text-sm">{res.name}</div>
                            </td>
                            {dates.map((date, idx) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const booked = globalTimeline[res.id] && globalTimeline[res.id][dateStr] 
                                    ? globalTimeline[res.id][dateStr] 
                                    : 0;
                                
                                // Учитываем график для корректного цвета (макс загрузка)
                                const maxHours = (res.scheduleOverrides && res.scheduleOverrides[dateStr] !== undefined) 
                                    ? res.scheduleOverrides[dateStr] 
                                    : res.hoursPerDay;
                                
                                const cellClass = getCellColor(booked, maxHours);
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                return (
                                    <td 
                                        key={idx} 
                                        className={`p-1 border-b border-gray-100 text-center border-r border-dashed ${isWeekend ? 'bg-gray-50' : ''}`}
                                        onClick={() => handleCellClick(res, dateStr, booked)}
                                    >
                                        <div className={`w-full h-full py-2 rounded text-xs cursor-pointer ${cellClass}`}>
                                            {booked > 0 ? booked.toFixed(1) : '-'}
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
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{selectedCell.resName}</h3>
                            <p className="text-xs text-slate-300">{selectedCell.dateStr} — Загрузка: {selectedCell.totalHours} ч</p>
                        </div>
                        <button onClick={() => setSelectedCell(null)} className="text-white/70 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                        {selectedCell.tasks.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Нет детальных данных</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedCell.tasks.map((task, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{task.productName}</div>
                                            <div className="text-xs text-blue-600">{task.name}</div>
                                            {task.orderNumber && <div className="text-[10px] text-gray-400">Заказ {task.orderNumber}</div>}
                                        </div>
                                        <div className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded text-sm">
                                            {task.hours.toFixed(1)} ч
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-gray-50 text-center border-t border-gray-200">
                        <button onClick={() => setSelectedCell(null)} className="text-sm font-bold text-blue-600 hover:underline">
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}