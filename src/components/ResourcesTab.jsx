import React, { useState, useMemo } from 'react';
import {
  Plus, User, MapPin, Phone, Calendar, Archive,
  X, Save, ShieldAlert, ChevronLeft, ChevronRight, Clock,
  Thermometer, MinusCircle, CheckCircle, Briefcase, Percent,
  DollarSign, AlertCircle
} from 'lucide-react';

// ИМПОРТ КОМПОНЕНТА КТУ (из папки reports, куда мы его сохраняли ранее)
import MasterEfficiencyView from './reports/MasterEfficiencyView';

export default function ResourcesTab({ resources, setResources, actions }) {
  // Добавлена вкладка 'ktu'
  const [activeView, setActiveView] = useState('table'); // 'table' | 'cards' | 'archive' | 'ktu'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedResource, setSelectedResource] = useState(null); 
  const [shiftModal, setShiftModal] = useState(null); 

  const changeMonth = (delta) => {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + delta);
      setCurrentDate(d);
  };
  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const activeResources = resources.filter(r => r.status !== 'fired');
  const firedResources = resources.filter(r => r.status === 'fired');

  // Уволенные за последний месяц — для блока "К расчёту" в архиве
  const recentlyFiredWithSalary = useMemo(() => {
      const now = new Date();
      return firedResources.filter(r => {
          if (!r.firedAt) return false;
          const firedDate = new Date(r.firedAt);
          const cutoff = new Date(firedDate);
          cutoff.setMonth(cutoff.getMonth() + 1);
          return now <= cutoff;
      }).map(res => {
          const firedDate = new Date(res.firedAt);
          const firedYear = firedDate.getFullYear();
          const firedMonth = firedDate.getMonth();
          const firedDateStr = res.firedAt.split('T')[0];
          const daysInFiredMonth = new Date(firedYear, firedMonth + 1, 0).getDate();
          const standardHours = parseFloat(res.hoursPerDay) || 8;
          const baseRate = parseFloat(res.baseRate) || 0;
          const hourlyRate = baseRate / 8;

          let hoursWorked = 0;
          let shiftsWorked = 0;
          let totalEarned = 0;

          for (let day = 1; day <= daysInFiredMonth; day++) {
              const dateStr = `${firedYear}-${String(firedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              if (dateStr > firedDateStr) break;

              const dateObj = new Date(dateStr + 'T00:00:00');
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isWorkDay = res.workWeekends ? true : !isWeekend;

              const employmentDate = res.employmentDate || res.startDate;
              if (employmentDate && dateStr < employmentDate) continue;

              const override = res.scheduleOverrides?.[dateStr];
              let dailyHours = 0;
              if (override !== undefined) dailyHours = override;
              else if (isWorkDay) dailyHours = standardHours;

              if (dailyHours > 0) {
                  hoursWorked += dailyHours;
                  shiftsWorked++;
                  totalEarned += hourlyRate * dailyHours;
              }
          }

          const monthKey = `${firedYear}-${String(firedMonth + 1).padStart(2, '0')}`;
          const advance = res.advances?.[monthKey] || 0;
          const toPay = totalEarned - advance;

          return { ...res, hoursWorked, shiftsWorked, totalEarned, advance, toPay, firedDate };
      }).filter(r => r.totalEarned > 0);
  }, [firedResources]);

  return (
    <div className="pb-20 fade-in font-sans text-slate-800">
      
      {/* ЗАГОЛОВОК И НАВИГАЦИЯ */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 pt-2">
          <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                  <User className="text-orange-600" size={32} />
                  Цех: Персонал
              </h2>
              <p className="text-sm text-slate-500 font-medium tracking-wide border-l-2 border-orange-500 pl-2 mt-1">
                  УПРАВЛЕНИЕ СМЕНАМИ И КАДРАМИ
              </p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner overflow-x-auto">
              <button 
                  onClick={() => setActiveView('table')} 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeView === 'table' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <Calendar size={16}/> Таблица смен
              </button>
              
              <button 
                  onClick={() => setActiveView('ktu')} 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeView === 'ktu' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <Percent size={16}/> КТУ / ТБ
              </button>

              <button 
                  onClick={() => setActiveView('cards')} 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeView === 'cards' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <User size={16}/> Карточки
              </button>
              
              <button 
                  onClick={() => setActiveView('archive')} 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeView === 'archive' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <Archive size={16}/> Архив
              </button>
          </div>
      </div>

      {/* --- ВИД: КТУ (НОВЫЙ) --- */}
      {activeView === 'ktu' && (
          <div className="fade-in">
              <MasterEfficiencyView resources={activeResources.filter(r => r.salaryEnabled !== false)} actions={actions} />
          </div>
      )}

      {/* --- ВИД: ТАБЛИЦА СМЕН --- */}
      {activeView === 'table' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col fade-in">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-4">
                      <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-300 transition"><ChevronLeft/></button>
                      <h3 className="text-xl font-bold capitalize text-slate-800 w-48 text-center">{monthName}</h3>
                      <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-300 transition"><ChevronRight/></button>
                  </div>
                  <div className="flex gap-4 text-[10px] uppercase font-bold text-slate-400">
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Болеет</div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Опоздал</div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Переработка</div>
                  </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs border-collapse">
                      <thead>
                          <tr className="bg-slate-800 text-slate-300">
                              <th className="p-2 text-center sticky left-0 bg-slate-800 z-10 min-w-[50px] border-r border-slate-700 font-bold text-xs" title="Официальное трудоустройство">
                                  ✓
                              </th>
                              <th className="p-3 text-left sticky left-[50px] bg-slate-800 z-10 min-w-[180px] border-r border-slate-700 font-bold uppercase tracking-wider">Сотрудник</th>
                              {daysArray.map(day => {
                                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                  return (
                                      <th key={day} className={`p-1 min-w-[34px] border-r border-slate-700 text-center ${isWeekend ? 'bg-slate-700/50 text-orange-400' : ''}`}>
                                          <div className="font-bold text-sm text-white">{day}</div>
                                          <div className="text-[9px] uppercase opacity-70">{date.toLocaleDateString('ru-RU', {weekday: 'short'})}</div>
                                      </th>
                                  );
                              })}
                              <th className="p-3 text-center bg-emerald-700 border-l-2 border-emerald-500 min-w-[80px] font-bold uppercase tracking-wider sticky right-0 z-10">
                                  <Clock size={14} className="inline mr-1"/>
                                  Часов
                              </th>
                          </tr>
                      </thead>
                      <tbody>
                          {activeResources.map(res => {
                              // Подсчет общего количества часов за месяц
                              let totalHours = 0;
                              const noKtuPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];

                              daysArray.forEach(day => {
                                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                  const override = res.scheduleOverrides?.[dateStr];
                                  const reason = res.scheduleReasons?.[dateStr];
                                  // ЗАЩИТА: ограничиваем standardHours разумными пределами (1-24 часа)
                                  const rawStandardHours = res.hoursPerDay || 8;
                                  const standardHours = Math.min(Math.max(rawStandardHours, 0), 24);

                                  const dateObj = new Date(dateStr);
                                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                  const isWorkDay = res.workWeekends ? true : !isWeekend;
                                  const effectiveStartDate = res.startDate || res.employmentDate;
                                  const isBeforeStartDate = effectiveStartDate && new Date(dateStr) < new Date(effectiveStartDate);

                                  if (!isBeforeStartDate && reason !== 'sick' && reason !== 'absent') {
                                      let dayHours = 0;
                                      if (override !== undefined) {
                                          // ЗАЩИТА: ограничиваем override разумными пределами
                                          dayHours = Math.min(Math.max(override, 0), 24);
                                      } else if (isWorkDay) {
                                          dayHours = standardHours;
                                      }

                                      // ВАЖНО: Проверяем КТУ только для должностей, у которых КТУ обязательно
                                      // и только для сотрудников с расчетом ЗП.
                                      // Для Мастера, Технолога и Стажёра КТУ не требуется
                                      if (!noKtuPositions.includes(res.position) && res.salaryEnabled !== false) {
                                          const ktuValue = res.dailyEfficiency?.[dateStr];
                                          if (ktuValue === undefined) {
                                              dayHours = 0;
                                          }
                                      }

                                      totalHours += dayHours;
                                  }
                              });

                              const isOfficial = res.isOfficiallyEmployed ?? false;

                              return (
                              <tr key={res.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  {/* Чекбокс официального трудоустройства */}
                                  <td className="p-2 sticky left-0 bg-white border-r border-slate-200 z-10 text-center">
                                      <input
                                          type="checkbox"
                                          checked={isOfficial}
                                          onChange={(e) => actions.updateResource(res.id, 'isOfficiallyEmployed', e.target.checked)}
                                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                          title="Официальное трудоустройство"
                                          onClick={(e) => e.stopPropagation()}
                                      />
                                  </td>

                                  {/* Фамилия сотрудника */}
                                  <td
                                    className={`p-3 sticky left-[50px] border-r z-10 font-bold cursor-pointer hover:text-orange-600 truncate transition-colors ${
                                        isOfficial
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-white text-slate-700 border-slate-200'
                                    }`}
                                    onClick={() => setSelectedResource(res)}
                                  >
                                      {res.name}
                                      <div className={`text-[9px] font-normal flex items-center gap-1 ${isOfficial ? 'text-emerald-700' : 'text-slate-400'}`}>
                                          {res.position}
                                      </div>
                                  </td>
                                  
                                  {daysArray.map(day => {
                                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

                                      const override = res.scheduleOverrides?.[dateStr];
                                      const reason = res.scheduleReasons?.[dateStr];
                                      const standardHours = res.hoursPerDay || 8;

                                      const dateObj = new Date(dateStr);
                                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                      const isWorkDay = res.workWeekends ? true : !isWeekend;

                                      // Проверяем дату начала работы сотрудника
                                      const effectiveStartDate = res.startDate || res.employmentDate;
                                      const isBeforeStartDate = effectiveStartDate && new Date(dateStr) < new Date(effectiveStartDate);

                                      // Определяем был ли день отработан (для зеленой подсветки)
                                      let dayWorked = false;
                                      if (!isBeforeStartDate && reason !== 'sick' && reason !== 'absent') {
                                          if (override !== undefined && override > 0) {
                                              dayWorked = true;
                                          } else if (isWorkDay && override === undefined) {
                                              // Стандартный рабочий день
                                              // Для должностей с КТУ проверяем наличие КТУ
                                              if (!noKtuPositions.includes(res.position)) {
                                                  const ktuValue = res.dailyEfficiency?.[dateStr];
                                                  if (ktuValue !== undefined) dayWorked = true;
                                              } else {
                                                  // Для должностей без КТУ - день считается отработанным
                                                  dayWorked = true;
                                              }
                                          }
                                      }

                                      let content = null;
                                      let cellClass = isWeekend ? 'bg-slate-50' : 'bg-white';

                                      // Зеленая подсветка для отработанных дней
                                      if (dayWorked) {
                                          cellClass = 'bg-emerald-50';
                                      }

                                      if (isBeforeStartDate) {
                                          // Дата до начала работы - показываем как "Прогул/Отгул"
                                          content = <X size={14} className="text-slate-400 mx-auto"/>;
                                          cellClass = 'bg-slate-100 cursor-not-allowed';
                                      } else if (reason === 'sick') {
                                          content = <Thermometer size={14} className="text-red-500 mx-auto"/>;
                                          cellClass = 'bg-red-50';
                                      } else if (reason === 'absent') {
                                          content = <X size={14} className="text-slate-400 mx-auto"/>;
                                          cellClass = 'bg-slate-100';
                                      } else if (reason === 'late') {
                                          content = <span className="font-bold text-orange-600">{override}</span>;
                                          cellClass = 'bg-orange-50';
                                      } else if (reason === 'overtime') {
                                          content = <span className="font-black text-blue-600">{override}</span>;
                                          cellClass = 'bg-blue-50';
                                      } else if (override !== undefined) {
                                          content = <span className="font-medium text-slate-700">{override}</span>;
                                          if(override === 0) cellClass = 'bg-slate-100';
                                      } else {
                                          content = isWorkDay ? <span className="text-slate-300 text-[10px]">{standardHours}</span> : <span className="text-slate-200">-</span>;
                                      }

                                      return (
                                          <td
                                            key={day}
                                            className={`border-r border-slate-100 text-center transition-all p-0 h-10 ${cellClass} ${isBeforeStartDate ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-orange-300 hover:z-20'}`}
                                            onClick={() => !isBeforeStartDate && setShiftModal({ resource: res, dateStr, currentHours: override ?? (isWorkDay ? standardHours : 0) })}
                                          >
                                              {content}
                                          </td>
                                      );
                                  })}

                                  {/* Итоговая ячейка с часами */}
                                  <td className={`p-3 text-center font-black text-lg ${totalHours > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'} border-l-2 border-emerald-500 sticky right-0 z-10`}>
                                      {totalHours}
                                  </td>
                              </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ВИД: КАРТОЧКИ --- */}
      {(activeView === 'cards' || activeView === 'archive') && (
          <div className="fade-in">
              <div className="flex justify-end mb-4">
                  {activeView === 'cards' && (
                      <button 
                        onClick={() => setSelectedResource({})} 
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:shadow-orange-500/50 transition-all active:scale-95 font-bold uppercase tracking-wide text-sm"
                      >
                        <Plus size={18} strokeWidth={3} /> Добавить
                      </button>
                  )}
              </div>

              {/* Блок "К расчёту" для недавно уволенных */}
              {activeView === 'archive' && recentlyFiredWithSalary.length > 0 && (
                  <div className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                          <AlertCircle size={18} className="text-red-500" />
                          <h3 className="font-black text-slate-800 uppercase text-sm tracking-wide">К расчёту при увольнении</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {recentlyFiredWithSalary.map(res => (
                              <div key={res.id} className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                      <div>
                                          <div className="font-bold text-slate-800">{res.name}</div>
                                          <div className="text-[10px] text-slate-400 uppercase font-bold">{res.position}</div>
                                      </div>
                                      <span className="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-600 rounded-lg uppercase">
                                          Уволен {res.firedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                  </div>
                                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Смен в месяце увольнения</span>
                                          <span className="font-bold text-slate-700">{res.shiftsWorked}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Часов отработано</span>
                                          <span className="font-bold text-slate-700">{parseFloat(res.hoursWorked.toFixed(1))}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Начислено</span>
                                          <span className="font-bold text-slate-700">{Math.round(res.totalEarned).toLocaleString()} ₽</span>
                                      </div>
                                      {res.advance > 0 && (
                                          <div className="flex justify-between">
                                              <span className="text-slate-500">Аванс</span>
                                              <span className="font-bold text-orange-600">−{Math.round(res.advance).toLocaleString()} ₽</span>
                                          </div>
                                      )}
                                      <div className="flex justify-between pt-2 border-t border-dashed border-slate-200">
                                          <span className="font-bold text-slate-700">К выплате</span>
                                          <span className="font-black text-lg text-emerald-600">{Math.round(res.toPay).toLocaleString()} ₽</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(activeView === 'cards' ? activeResources : firedResources).map(res => (
                      <div 
                        key={res.id} 
                        onClick={() => setSelectedResource(res)}
                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                      >
                          {res.status === 'fired' && <div className="absolute top-0 left-0 w-full bg-slate-200 text-slate-500 text-[10px] font-bold uppercase text-center py-1">Уволен: {new Date(res.firedAt).toLocaleDateString()}</div>}
                          <div className="flex items-start gap-4 mt-2">
                              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors shrink-0 overflow-hidden border border-slate-200">
                                  {res.photoUrl ? <img src={res.photoUrl} alt={res.name} className="w-full h-full object-cover"/> : <User size={32}/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg text-slate-800 truncate group-hover:text-orange-600 transition-colors">{res.name}</h3>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Briefcase size={12}/> {res.position || 'Сотрудник'}</div>
                                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                                      <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12} className="text-slate-300 shrink-0"/> {res.phone || 'Нет телефона'}</div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={12} className="text-slate-300 shrink-0"/> <span className="truncate">{res.address || 'Адрес не указан'}</span></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Модалки (те же самые) */}
      {selectedResource && <EmployeeModal resource={selectedResource} onClose={() => setSelectedResource(null)} actions={actions} />}
      {shiftModal && <ShiftEditModal data={shiftModal} onClose={() => setShiftModal(null)} onSave={actions.updateResourceSchedule} />}
    </div>
  );
}

// ... EmployeeModal и ShiftEditModal (вставь их код из предыдущего ответа, он не менялся) ...
// Для полноты картины, вот они:

function EmployeeModal({ resource, onClose, actions }) {
    const isNew = !resource.id;

    // Список должностей
    const POSITIONS = [
        'Стажёр',
        'Мастер',
        'Технолог',
        'Плазморез',
        'Слесарь',
        'Разнорабочий',
        'Кладовщик',
        'Маляр',
        'Сварщик',
        'Электрик',
        'Лентопил'
    ];

    const [formData, setFormData] = useState({
        name: resource.name || '',
        position: resource.position || '',
        phone: resource.phone || '',
        address: resource.address || '',
        dob: resource.dob || '',
        employmentDate: resource.employmentDate || new Date().toISOString().split('T')[0],
        probationEndDate: resource.probationEndDate || '', // Дата окончания испытательного срока
        baseRate: resource.baseRate || '',
        hoursPerDay: resource.hoursPerDay || 8,
        workWeekends: resource.workWeekends || false,
        photoUrl: resource.photoUrl || '',
        salaryEnabled: resource.salaryEnabled !== undefined ? resource.salaryEnabled : true,
        isOfficiallyEmployed: resource.isOfficiallyEmployed !== undefined ? resource.isOfficiallyEmployed : false
    });

    const handleChange = (field, value) => {
        // Автоматически рассчитываем дату окончания испытательного срока при изменении даты трудоустройства или должности
        if (field === 'employmentDate' || field === 'position') {
            const empDate = field === 'employmentDate' ? value : formData.employmentDate;
            const pos = field === 'position' ? value : formData.position;

            if (empDate) {
                const probationEnd = new Date(empDate);
                // Плазморез - 30 дней, Стажёр - 7 дней (максимум), остальные - 7 дней
                const probationDays = pos === 'Плазморез' ? 30 : 7;
                probationEnd.setDate(probationEnd.getDate() + probationDays);

                // Обновляем formData со всеми изменениями сразу
                setFormData(prev => ({
                    ...prev,
                    [field]: value,
                    probationEndDate: probationEnd.toISOString().split('T')[0]
                }));
                return;
            }
        }

        // Для остальных полей - обычное обновление
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Введите имя");
        if (!isNew) {
            Object.keys(formData).forEach(key => {
                if (formData[key] !== resource[key]) {
                    actions.updateResource(resource.id, key, formData[key]);
                }
            });
        } else {
            await actions.addResource(formData);
        }
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Вы уверены, что хотите УДАЛИТЬ сотрудника ${formData.name}? Это действие необратимо!`)) {
            actions.deleteResource(resource.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Заголовок */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">{isNew ? 'Новый сотрудник' : formData.name}</h2>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-slate-300 transition">
                        <X size={20}/>
                    </button>
                </div>

                {/* Форма */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    {/* ФИО и Должность */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">ФИО</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                        <div className="relative z-[70]">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Должность</label>
                            <select
                                value={formData.position}
                                onChange={e => handleChange('position', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition bg-white cursor-pointer"
                            >
                                <option value="">Выберите должность</option>
                                {POSITIONS.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Дата начала работы и Дата окончания испытательного срока */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Дата начала работы</label>
                            <input
                                type="date"
                                value={formData.employmentDate}
                                onChange={e => handleChange('employmentDate', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                Окончание исп. срока
                                <span className="text-[9px] text-slate-400 ml-1 normal-case">({formData.position === 'Плазморез' ? '30' : '7'} дн.)</span>
                            </label>
                            <input
                                type="date"
                                value={formData.probationEndDate}
                                onChange={e => handleChange('probationEndDate', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Телефон и Адрес */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Телефон</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => handleChange('phone', e.target.value)}
                                placeholder="+7 (___) ___-__-__"
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Адрес</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={e => handleChange('address', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Ставка и Часов */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ставка (₽)</label>
                            <input
                                type="number"
                                value={formData.baseRate}
                                onChange={e => handleChange('baseRate', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Часов в день</label>
                            <input
                                type="number"
                                value={formData.hoursPerDay}
                                onChange={e => handleChange('hoursPerDay', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-medium focus:border-orange-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Переключатель расчета зарплаты */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.salaryEnabled}
                                onChange={e => handleChange('salaryEnabled', e.target.checked)}
                                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                            />
                            <div>
                                <div className="text-sm font-bold text-slate-700">Расчет зарплаты</div>
                                <div className="text-xs text-slate-500">Включите для постоянных сотрудников</div>
                            </div>
                        </label>
                    </div>

                    {/* Переключатель официального трудоустройства */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isOfficiallyEmployed}
                                onChange={e => handleChange('isOfficiallyEmployed', e.target.checked)}
                                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <div>
                                <div className="text-sm font-bold text-emerald-700">Официальное трудоустройство</div>
                                <div className="text-xs text-slate-500">Отображается зеленым в таблице смен</div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Футер */}
                <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50">
                    <div className="flex gap-2">
                        {!isNew && resource.status !== 'fired' && (
                            <button
                                onClick={() => { actions.fireResource(resource.id); onClose(); }}
                                className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-bold text-xs uppercase transition"
                            >
                                Уволить
                            </button>
                        )}
                        {!isNew && resource.status === 'fired' && (
                            <button
                                onClick={() => { actions.updateResource(resource.id, 'status', 'active'); onClose(); }}
                                className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg font-bold text-xs uppercase transition"
                            >
                                Восстановить
                            </button>
                        )}
                        {!isNew && (
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs uppercase transition"
                            >
                                Удалить
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-slate-900 hover:bg-orange-600 text-white rounded-lg font-bold transition"
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShiftEditModal({ data, onClose, onSave }) {
    const { resource, dateStr, currentHours } = data;
    const [hours, setHours] = useState(currentHours);
    const [type, setType] = useState(null); 
    const handleSave = () => { onSave(resource.id, dateStr, hours, type); onClose(); };
    const statusOptions = [ { id: null, label: 'Стандарт', color: 'bg-slate-100 text-slate-600', icon: CheckCircle }, { id: 'sick', label: 'Болеет', color: 'bg-red-100 text-red-600', icon: Thermometer, setHours: 0 }, { id: 'late', label: 'Опоздал', color: 'bg-orange-100 text-orange-600', icon: Clock, setHours: resource.hoursPerDay - 1 }, { id: 'overtime', label: 'Переработка', color: 'bg-blue-100 text-blue-600', icon: Plus, setHours: resource.hoursPerDay + 2 }, { id: 'absent', label: 'Прогул/Отгул', color: 'bg-slate-200 text-slate-500', icon: MinusCircle, setHours: 0 } ];
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-4">{resource.name}</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">{statusOptions.map(opt => (<button key={opt.id || 'std'} onClick={() => { setType(opt.id); if (opt.setHours !== undefined) setHours(opt.setHours); }} className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 border-2 ${type === opt.id ? 'border-slate-800 ring-1 ring-slate-800 ' + opt.color : 'border-transparent hover:bg-slate-50 ' + opt.color.replace('text-', 'text-opacity-70 text-')}`}><opt.icon size={16}/> {opt.label}</button>))}</div>
                <div className="mb-6"><label className="text-[10px] font-bold text-slate-400 uppercase">Часов</label><input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="w-full text-center text-4xl font-black text-slate-800 border-b-2 border-slate-100 outline-none py-2" autoFocus/></div>
                <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Отмена</button><button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-orange-600">Сохранить</button></div>
            </div>
        </div>
    );
}