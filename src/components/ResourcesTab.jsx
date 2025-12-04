// src/components/ResourcesTab.jsx
import React from 'react';
import { User, Trash2, Clock, Briefcase } from 'lucide-react';
import { formatDate, getMonthDays, isWeekend } from '../utils/helpers';
import { EMPLOYEE_ROLES } from '../utils/constants';

export default function ResourcesTab({ resources, setResources, actions }) {
  const today = new Date();
  const daysInMonth = getMonthDays(today.getFullYear(), today.getMonth());

  // Компонент для выбора ролей
  const RoleSelector = ({ resource }) => {
      const currentRoles = resource.roles || [];
      
      const toggleRole = (roleId) => {
          if (currentRoles.includes(roleId)) {
              actions.updateResourceRoles(resource.id, currentRoles.filter(id => id !== roleId));
          } else {
              actions.updateResourceRoles(resource.id, [...currentRoles, roleId]);
          }
      };

      return (
          <div className="flex flex-wrap gap-2 mt-2">
              {EMPLOYEE_ROLES.map(role => {
                  const isActive = currentRoles.includes(role.id);
                  return (
                      <button
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                              isActive 
                                ? role.color + ' border-transparent font-bold' 
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                      >
                          {role.name}
                      </button>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="space-y-8">
      {/* КАРТОЧКИ СОТРУДНИКОВ С НАСТРОЙКАМИ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(resource => (
          <div key={resource.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
                  <User size={24} />
                </div>
                <div>
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
                        className="w-10 bg-gray-50 border border-gray-200 rounded text-center ml-1 font-semibold"
                      />
                  </div>
                </div>
              </div>
              <button onClick={() => actions.deleteResource(resource.id)} className="text-gray-400 hover:text-red-500 transition">
                <Trash2 size={18} />
              </button>
            </div>
            
            {/* Секция ролей */}
            <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    <Briefcase size={12}/> Должности
                </div>
                <RoleSelector resource={resource} />
            </div>
          </div>
        ))}
        
        {/* Кнопка добавления */}
        <button 
          onClick={actions.addResource}
          className="flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-5 hover:bg-blue-50 hover:border-blue-300 transition-colors text-gray-500 hover:text-blue-600 h-full min-h-[160px]"
        >
           <div className="bg-white p-3 rounded-full shadow-sm">
             <User size={24} />
           </div>
           <span className="font-medium">Добавить сотрудника</span>
        </button>
      </div>

      {/* КАЛЕНДАРЬ (Оставляем пока как есть, но это задел на будущее) */}
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