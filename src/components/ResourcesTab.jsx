import React from 'react';
import { User, Trash2, Clock } from 'lucide-react';
import { formatDate, getMonthDays, isWeekend } from '../utils/helpers';

export default function ResourcesTab({ resources, setResources, actions }) {
  const today = new Date();
  const daysInMonth = getMonthDays(today.getFullYear(), today.getMonth());

  return (
    <div className="space-y-8">
      {/* КАРТОЧКИ СОТРУДНИКОВ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(resource => (
          <div key={resource.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 w-full">
                <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
                  <User size={24} />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={resource.name}
                    onChange={(e) => setResources(resource.id, 'name', e.target.value)}
                    className="font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-500 outline-none transition-colors w-full"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock size={12}/>
                      <span>Макс. часов:</span>
                      <input 
                        type="number" 
                        value={resource.hoursPerDay}
                        onChange={(e) => setResources(resource.id, 'hoursPerDay', Number(e.target.value))}
                        className="w-12 bg-gray-50 border border-gray-200 rounded text-center ml-1 font-semibold"
                      />
                  </div>
                </div>
              </div>
              <button onClick={() => actions.deleteResource(resource.id)} className="text-gray-400 hover:text-red-500 transition ml-2">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        
        {/* Кнопка добавления */}
        <button 
          onClick={actions.addResource}
          className="flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-5 hover:bg-blue-50 hover:border-blue-300 transition-colors text-gray-500 hover:text-blue-600 h-full min-h-[100px]"
        >
           <div className="bg-white p-3 rounded-full shadow-sm">
             <User size={24} />
           </div>
           <span className="font-medium">Добавить сотрудника</span>
        </button>
      </div>

      {/* КАЛЕНДАРЬ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
         <h3 className="text-lg font-bold text-gray-800 mb-4">График доступности (на {today.toLocaleString('default', { month: 'long' })})</h3>
         <div className="min-w-[800px]">
             <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(30px,1fr))] gap-1 mb-2">
                 <div className="font-bold text-gray-500 text-xs uppercase">Сотрудник</div>
                 {daysInMonth.map(d => (
                     <div key={d} className={`text-center text-xs font-medium ${isWeekend(d) ? 'text-red-400' : 'text-gray-600'}`}>
                         {d.getDate()}
                     </div>
                 ))}
             </div>
             
             {resources.map(res => (
                 <div key={res.id} className="grid grid-cols-[200px_repeat(auto-fit,minmax(30px,1fr))] gap-1 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                     <div className="truncate text-sm font-medium text-gray-700 pr-4">{res.name}</div>
                     {daysInMonth.map(d => {
                         const dateStr = formatDate(d);
                         const schedule = res.schedule?.[dateStr];
                         const isOff = isWeekend(d);
                         
                         let cellColor = isOff ? 'bg-gray-100' : 'bg-blue-50';
                         if (schedule?.type === 'sick') cellColor = 'bg-red-100';
                         if (schedule?.type === 'vacation') cellColor = 'bg-yellow-100';
                         
                         return (
                             <div 
                               key={d} 
                               className={`h-6 rounded-sm ${cellColor}`}
                               title={schedule?.type || (isOff ? 'Выходной' : 'Рабочий')}
                             ></div>
                         )
                     })}
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
}