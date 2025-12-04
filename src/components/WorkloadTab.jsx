import React, { useState } from 'react';
import { formatDate, getResourceHoursForDate, isWeekend } from '../utils/helpers';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

export default function WorkloadTab({ resources, globalTimeline }) {
  // По умолчанию открыто
  const [isOpen, setIsOpen] = useState(true);

  // Генерируем даты на 14 дней вперед
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-300">
      {/* КЛИКАБЕЛЬНЫЙ ЗАГОЛОВОК */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  <BarChart3 size={24} />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-gray-800">Детальная загрузка</h2>
                  {!isOpen && <p className="text-xs text-gray-500">Нажмите, чтобы развернуть таблицу на 2 недели</p>}
              </div>
          </div>
          
          <button 
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
      </div>
      
      {/* ТАБЛИЦА */}
      {isOpen && (
        <div className="mt-6 overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Сотрудник
                </th>
                {dates.map(date => (
                  <th key={date.toString()} className={`p-2 text-center border-b border-gray-200 text-xs font-bold w-16 ${isWeekend(date) ? 'text-red-400 bg-red-50' : 'text-gray-600 bg-gray-50'}`}>
                    <div>{date.getDate()}</div>
                    <div className="text-[10px] opacity-75">{date.toLocaleString('ru', { weekday: 'short' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => (
                <tr key={resource.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                  <td className="p-3 text-sm font-bold text-gray-700 bg-white sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {resource.name}
                      <div className="text-[10px] font-normal text-gray-400 flex flex-wrap gap-1 mt-1">
                          {resource.roles?.map(r => <span key={r} className="bg-gray-100 px-1 rounded">{r}</span>)}
                      </div>
                  </td>
                  
                  {dates.map(date => {
                    const dateStr = formatDate(date);
                    const used = globalTimeline[resource.id]?.[dateStr] || 0;
                    const capacity = getResourceHoursForDate(resource, date);
                    
                    let bgClass = 'bg-white';
                    let textClass = 'text-gray-300';
                    let content = '-';

                    if (capacity === 0) {
                        bgClass = 'bg-gray-50'; 
                    } else if (used > 0) {
                        content = used.toFixed(1);
                        textClass = 'text-gray-800 font-bold';
                        
                        const loadPercent = used / capacity;
                        if (loadPercent <= 0.5) bgClass = 'bg-green-100 text-green-800'; 
                        else if (loadPercent <= 0.9) bgClass = 'bg-blue-100 text-blue-800'; 
                        else if (loadPercent <= 1.0) bgClass = 'bg-yellow-100 text-yellow-800'; 
                        else bgClass = 'bg-red-200 text-red-800'; 
                    }

                    return (
                      <td key={dateStr} className={`p-2 text-center text-xs border-r border-gray-50 last:border-0 ${bgClass} transition-colors`}>
                        <span className={textClass}>{content}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}