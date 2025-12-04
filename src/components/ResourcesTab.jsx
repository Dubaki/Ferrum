import React, { useState } from 'react';
import { Calendar, Trash2, Plus, X } from 'lucide-react';
import { formatDate, getMonthDays, isWeekend } from '../utils/helpers';

export default function ResourcesTab({ resources, setResources, actions }) {
  const [editingScheduleResource, setEditingScheduleResource] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Логика переключения статуса дня (продублирована здесь для UI)
  const toggleDayStatus = (resourceId, dateStr) => {
    setResources(resources.map(res => {
      if (res.id !== resourceId) return res;
      
      const currentStatus = res.schedule[dateStr]?.type;
      let newSchedule = { ...res.schedule };

      if (!currentStatus) {
        const date = new Date(dateStr);
        if (isWeekend(date)) {
            newSchedule[dateStr] = { type: 'work', hours: res.hoursPerDay };
        } else {
            newSchedule[dateStr] = { type: 'sick', hours: 0 };
        }
      } else if (currentStatus === 'work') {
        newSchedule[dateStr] = { type: 'sick', hours: 0 };
      } else if (currentStatus === 'sick') {
        newSchedule[dateStr] = { type: 'vacation', hours: 0 };
      } else {
        delete newSchedule[dateStr];
      }
      return { ...res, schedule: newSchedule };
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
         <h2 className="text-xl font-bold mb-6 text-gray-800">Управление персоналом</h2>
         <div className="space-y-4">
           {resources.map(res => {
              const todayStr = formatDate(new Date());
              const status = res.schedule[todayStr]?.type;
              
              return (
             <div key={res.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition hover:shadow-md">
                <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg 
                      ${status === 'sick' ? 'bg-red-100 text-red-600' : status === 'vacation' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                    {res.name.charAt(0)}
                  </div>
                  <div>
                    <input 
                      value={res.name}
                      onChange={(e) => actions.updateResource(res.id, 'name', e.target.value)}
                      className="font-bold text-lg bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-gray-800" 
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">Статус сегодня:</span>
                        {status === 'sick' && <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">Болеет</span>}
                        {status === 'vacation' && <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Отпуск</span>}
                        {!status && <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">В строю</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => setEditingScheduleResource(res)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-400 text-gray-700 text-sm font-medium transition shadow-sm"
                  >
                    <Calendar size={16} /> График
                  </button>
                  <button 
                    onClick={() => actions.deleteResource(res.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
             </div>
           )})}
         </div>
         <button onClick={actions.addResource} className="mt-6 text-blue-600 font-bold flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-lg transition">
           <Plus size={20} /> Добавить сотрудника
         </button>

        {/* МОДАЛЬНОЕ ОКНО */}
        {editingScheduleResource && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[450px]">
                <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">График: {editingScheduleResource.name}</h3>
                <button onClick={() => setEditingScheduleResource(null)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
                </div>
                
                <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded">←</button>
                <span className="font-bold capitalize text-lg">
                    {currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded">→</button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4 text-center text-sm font-medium">
                {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map(d => <div key={d} className="text-gray-400">{d}</div>)}
                {(() => {
                    const days = getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());
                    const offset = days[0].getDay();
                    const blanks = Array(offset).fill(null);
                    
                    return [...blanks, ...days].map((date, idx) => {
                    if (!date) return <div key={`blank-${idx}`}></div>;
                    const dateStr = formatDate(date);
                    const status = editingScheduleResource.schedule[dateStr];
                    const isWknd = isWeekend(date);
                    
                    let bgClass = 'bg-gray-50 hover:bg-gray-100 text-gray-600';
                    if (status?.type === 'sick') bgClass = 'bg-red-500 text-white hover:bg-red-600';
                    else if (status?.type === 'vacation') bgClass = 'bg-yellow-400 text-white hover:bg-yellow-500';
                    else if (status?.type === 'work') bgClass = 'bg-green-500 text-white hover:bg-green-600';
                    else if (isWknd) bgClass = 'bg-slate-100 text-slate-300';

                    return (
                        <button 
                        key={dateStr}
                        onClick={() => toggleDayStatus(editingScheduleResource.id, dateStr)}
                        className={`h-10 rounded-lg flex items-center justify-center transition text-sm ${bgClass}`}
                        >
                        {date.getDate()}
                        </button>
                    );
                    });
                })()}
                </div>
                
                <div className="flex justify-around text-xs mt-6 border-t pt-4 text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500"></div> Больничный</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-400"></div> Отпуск</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500"></div> Раб. выходной</div>
                </div>
            </div>
            </div>
        )}
    </div>
  );
}