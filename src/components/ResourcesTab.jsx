import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Plus, User, MapPin, Phone, Calendar, Archive,
  X, Save, ShieldAlert, ChevronLeft, ChevronRight, Clock,
  Thermometer, MinusCircle, CheckCircle, Briefcase, Percent,
  DollarSign, AlertCircle, MessageSquare
} from 'lucide-react';

// ИМПОРТ КОМПОНЕНТА КТУ (из папки reports, куда мы его сохраняли ранее)
import MasterEfficiencyView from './reports/MasterEfficiencyView';

// --- МЕМОИЗИРОВАННАЯ ЯЧЕЙКА ---
const ShiftCell = memo(({ 
    day, 
    dateStr, 
    res, 
    isWeekend, 
    isBeforeStartDate, 
    reason, 
    override, 
    standardHours, 
    isWorkDay, 
    onOpenModal 
}) => {
    // Определяем был ли день отработан
    let dayWorked = false;
    const noKtuPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];

    if (!isBeforeStartDate && reason !== 'sick' && reason !== 'absent') {
        if (override !== undefined && override > 0) {
            dayWorked = true;
        } else if (isWorkDay && override === undefined) {
            if (!noKtuPositions.includes(res.position)) {
                const ktuValue = res.dailyEfficiency?.[dateStr];
                if (ktuValue !== undefined) dayWorked = true;
            } else {
                dayWorked = true;
            }
        }
    }

    let content = null;
    let cellClass = isWeekend ? 'bg-slate-50/50' : 'bg-white';
    let innerClass = "w-full h-full flex items-center justify-center transition-all duration-300";

    if (dayWorked) {
        cellClass = 'bg-emerald-400/20 ring-1 ring-inset ring-emerald-500/20';
    }

    if (isBeforeStartDate) {
        content = <X size={12} className="text-slate-300 mx-auto"/>;
        cellClass = 'bg-slate-50 opacity-40 cursor-not-allowed';
    } else if (reason === 'sick') {
        content = (
            <div className="flex flex-col items-center">
                <Thermometer size={14} className="text-red-500 drop-shadow-sm animate-pulse"/>
                <span className="text-[8px] font-black text-red-700 mt-0.5">БОЛ</span>
            </div>
        );
        cellClass = 'bg-red-100/80 shadow-inner ring-1 ring-inset ring-red-200';
    } else if (reason === 'absent') {
        content = <X size={14} className="text-slate-400 mx-auto"/>;
        cellClass = 'bg-slate-100';
    } else if (reason === 'late') {
        content = (
            <div className="flex flex-col items-center">
                <span className="font-black text-orange-600 text-sm leading-none">{override}</span>
                <span className="text-[7px] font-black text-orange-500 tracking-tighter">ОПОЗД</span>
            </div>
        );
        cellClass = 'bg-orange-100/90 shadow-inner ring-1 ring-inset ring-orange-200';
    } else if (reason === 'overtime') {
        content = (
            <div className="flex flex-col items-center">
                <span className="font-black text-blue-700 text-sm leading-none">{override}</span>
                <span className="text-[7px] font-black text-blue-500 tracking-tighter">ПЕРЕР</span>
            </div>
        );
        cellClass = 'bg-blue-100/90 shadow-inner ring-1 ring-inset ring-blue-200';
    } else if (override !== undefined) {
        content = <span className="font-bold text-slate-700 text-sm">{override}</span>;
        if(override === 0) cellClass = 'bg-slate-100';
        else cellClass = 'bg-emerald-400/20 ring-1 ring-inset ring-emerald-500/20 shadow-sm';
    } else {
        content = isWorkDay 
            ? <span className="text-slate-400 font-medium text-[10px] opacity-40">{standardHours}</span> 
            : <span className="text-slate-200">-</span>;
    }

    return (
        <td
            className={`border-r border-slate-100 text-center transition-all p-0 h-12 relative ${cellClass} ${isBeforeStartDate ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-orange-500 hover:z-20 hover:scale-[1.15] hover:shadow-xl hover:rounded-sm group'}`}
            onClick={() => !isBeforeStartDate && onOpenModal(res, dateStr, override ?? (isWorkDay ? standardHours : 0))}
        >
            <div className={innerClass}>
                {content}
            </div>
        </td>
    );
});

// --- МЕМОИЗИРОВАННАЯ СТРОКА ---
const ResourceRow = memo(({ res, daysArray, currentDate, actions, onOpenModal, onSelectResource }) => {
    const isOfficial = res.isOfficiallyEmployed ?? false;
    
    // Подсчет часов (мемоизируем внутри строки)
    const totalHours = useMemo(() => {
        let total = 0;
        const noKtuPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];

        daysArray.forEach(day => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const override = res.scheduleOverrides?.[dateStr];
            const reason = res.scheduleReasons?.[dateStr];
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
                    dayHours = Math.min(Math.max(override, 0), 24);
                } else if (isWorkDay) {
                    dayHours = standardHours;
                }

                // Проверяем КТУ
                if (!noKtuPositions.includes(res.position) && res.salaryEnabled !== false) {
                    const ktuValue = res.dailyEfficiency?.[dateStr];
                    if (ktuValue === undefined && dayHours > 0) {
                        dayHours = 0;
                    }
                }
                total += dayHours;
            }
        });
        return total;
    }, [res, daysArray, currentDate]);

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="p-2 sticky left-0 bg-white border-r border-slate-200 z-10 text-center">
                <input
                    type="checkbox"
                    checked={isOfficial}
                    onChange={(e) => actions.updateResource(res.id, 'isOfficiallyEmployed', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                />
            </td>

            <td
                className={`p-3 sticky left-[50px] border-r z-10 font-black text-sm cursor-pointer hover:text-orange-600 truncate transition-all shadow-[5px_0_10px_rgba(0,0,0,0.02)] ${
                    isOfficial
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200'
                }`}
                onClick={() => onSelectResource(res)}
            >
                <div className="flex flex-col">
                    <span className="truncate tracking-tight">{res.name}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest leading-none mt-1 ${isOfficial ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {res.position}
                    </span>
                </div>
            </td>
            
            {daysArray.map(day => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dateObj = new Date(dateStr);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const effectiveStartDate = res.startDate || res.employmentDate;
                const isBeforeStartDate = effectiveStartDate && new Date(dateStr) < new Date(effectiveStartDate);
                
                return (
                    <ShiftCell 
                        key={day}
                        day={day}
                        dateStr={dateStr}
                        res={res}
                        isWeekend={isWeekend}
                        isBeforeStartDate={isBeforeStartDate}
                        reason={res.scheduleReasons?.[dateStr]}
                        override={res.scheduleOverrides?.[dateStr]}
                        standardHours={res.hoursPerDay || 8}
                        isWorkDay={res.workWeekends ? true : !isWeekend}
                        onOpenModal={onOpenModal}
                    />
                );
            })}

            <td className={`p-3 text-center font-black sticky right-0 z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.05)] ${totalHours > 0 ? 'bg-slate-900 text-orange-500' : 'bg-slate-100 text-slate-400'} border-l-2 border-orange-500/50`}>
                <span className="text-xl tracking-tighter">{totalHours}</span>
            </td>
        </tr>
    );
});

export default function ResourcesTab({ resources, setResources, actions, isAdmin }) {
  const [activeView, setActiveView] = useState('table'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedResource, setSelectedResource] = useState(null); 
  const [shiftModal, setShiftModal] = useState(null); 
  const [noteModal, setNoteModal] = useState(null); // { resourceId, name, note }

  // Стабильные коллбэки для оптимизации
  const handleOpenShiftModal = useCallback((resource, dateStr, currentHours) => {
      setShiftModal({ resource, dateStr, currentHours });
  }, []);

  const handleSelectResource = useCallback((res) => {
      setSelectedResource(res);
  }, []);

  const changeMonth = useCallback((delta) => {
      setCurrentDate(prev => {
          const d = new Date(prev);
          d.setMonth(d.getMonth() + delta);
          return d;
      });
  }, []);

  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysArray = useMemo(() => Array.from({length: daysInMonth}, (_, i) => i + 1), [daysInMonth]);

  const activeResources = useMemo(() => resources.filter(r => r.status !== 'fired'), [resources]);
  const firedResources = useMemo(() => resources.filter(r => r.status === 'fired'), [resources]);

  // Уволенные за последний месяц — для блока "К расчёту"
  const recentlyFiredWithSalary = useMemo(() => {
      const now = new Date();
      return firedResources.filter(r => {
          if (!r.firedAt || r.isSettled) return false;
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 pt-2">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 transition-transform hover:scale-105 duration-500">
                  <User className="text-white" size={28} />
              </div>
              <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                      Персонал
                  </h2>
                  <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Управление кадрами цеха
                  </p>
              </div>
          </div>
          
          <div className="flex bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-[20px] shadow-inner border border-slate-200/50 w-full xl:w-auto overflow-x-auto no-scrollbar">
              <button 
                  onClick={() => setActiveView('table')} 
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                      activeView === 'table' 
                      ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                  <Calendar size={14} strokeWidth={3} className={activeView === 'table' ? 'text-orange-500' : ''}/> 
                  <span>Смены</span>
              </button>
              
              <button 
                  onClick={() => setActiveView('ktu')} 
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                      activeView === 'ktu' 
                      ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                  <Percent size={14} strokeWidth={3} className={activeView === 'ktu' ? 'text-indigo-500' : ''}/> 
                  <span>КТУ / ТБ</span>
              </button>

              <button 
                  onClick={() => setActiveView('cards')} 
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                      activeView === 'cards' 
                      ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                  <User size={14} strokeWidth={3} className={activeView === 'cards' ? 'text-blue-500' : ''}/> 
                  <span>Карточки</span>
              </button>
              
              <button 
                  onClick={() => setActiveView('archive')} 
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                      activeView === 'archive' 
                      ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                  <Archive size={14} strokeWidth={3} className={activeView === 'archive' ? 'text-slate-600' : ''}/> 
                  <span>Архив</span>
              </button>
          </div>
      </div>

      {/* --- ВИД: КТУ --- */}
      {activeView === 'ktu' && (
          <div className="fade-in">
              <MasterEfficiencyView resources={activeResources.filter(r => r.salaryEnabled !== false)} actions={actions} />
          </div>
      )}

      {/* --- ВИД: ТАБЛИЦА СМЕН --- */}
      {activeView === 'table' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-slate-200 bg-slate-50 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                      <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-300 transition"><ChevronLeft/></button>
                      <h3 className="text-xl font-bold capitalize text-slate-800 w-48 text-center">{monthName}</h3>
                      <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-300 transition"><ChevronRight/></button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 shadow-sm transition-all hover:shadow-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Болеет</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 shadow-sm transition-all hover:shadow-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-700">Опоздал</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 shadow-sm transition-all hover:shadow-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Переработка</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Отработано</span>
                      </div>
                  </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar relative">
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-20 md:hidden"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-20 md:hidden"></div>
                  <table className="w-full text-xs border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-slate-900 text-slate-300">
                              <th className="p-2 text-center sticky left-0 bg-slate-900 z-10 min-w-[50px] border-r border-slate-800 font-bold text-xs" title="Официальное трудоустройство">
                                  <ShieldAlert size={14} className="mx-auto text-slate-500" />
                              </th>
                              <th className="p-4 text-left sticky left-[50px] bg-slate-900 z-10 min-w-[200px] border-r border-slate-800 font-black uppercase tracking-[0.1em] text-[10px]">Сотрудник</th>
                              {daysArray.map(day => {
                                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                  const isToday = new Date().toDateString() === date.toDateString();
                                  
                                  return (
                                      <th key={day} className={`p-1.5 min-w-[38px] border-r border-slate-800 text-center transition-colors ${
                                          isToday ? 'bg-orange-500/20 ring-1 ring-inset ring-orange-500/30' : 
                                          isWeekend ? 'bg-slate-800/50 text-orange-400' : ''
                                      }`}>
                                          <div className={`font-black text-sm ${isToday ? 'text-orange-500' : 'text-white'}`}>{day}</div>
                                          <div className={`text-[8px] font-bold uppercase tracking-tighter ${isToday ? 'text-orange-400' : 'opacity-50'}`}>
                                              {date.toLocaleDateString('ru-RU', {weekday: 'short'})}
                                          </div>
                                      </th>
                                  );
                              })}
                              <th className="p-4 text-center bg-slate-950 border-l-2 border-orange-500/30 min-w-[90px] font-black uppercase tracking-widest text-[10px] sticky right-0 z-10 text-orange-500">
                                  Итого
                              </th>
                          </tr>
                      </thead>
                      <tbody>
                          {activeResources.map(res => (
                              <ResourceRow 
                                  key={res.id}
                                  res={res}
                                  daysArray={daysArray}
                                  currentDate={currentDate}
                                  actions={actions}
                                  onOpenModal={handleOpenShiftModal}
                                  onSelectResource={handleSelectResource}
                              />
                          ))}
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
                              <div key={res.id} className="bg-white rounded-xl p-4 border border-red-100 shadow-sm relative overflow-hidden">
                                  {res.archiveNote && (
                                      <div className="mb-3 p-2 bg-amber-50 border-l-4 border-amber-400 rounded text-[10px] font-bold text-amber-800 italic">
                                          "{res.archiveNote}"
                                      </div>
                                  )}
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
                                  
                                  {/* КНОПКИ ДЕЙСТВИЯ (РАСЧЁТ И КОММЕНТАРИЙ) */}
                                  <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
                                      <button 
                                          onClick={() => setNoteModal({ resourceId: res.id, name: res.name, note: res.archiveNote || '' })}
                                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-bold text-[10px] uppercase"
                                      >
                                          <MessageSquare size={14} /> Коммент
                                      </button>
                                      <button 
                                          onClick={() => {
                                              if (window.confirm(`Подтверждаете, что сотрудник ${res.name} полностью рассчитан? Он будет скрыт из этого списка.`)) {
                                                  actions.settleResource(res.id);
                                              }
                                          }}
                                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-[10px] uppercase shadow-md shadow-emerald-100"
                                      >
                                          <CheckCircle size={14} /> Рассчитан
                                      </button>
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
                        onClick={() => handleSelectResource(res)}
                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                      >
                          {res.status === 'fired' && <div className="absolute top-0 left-0 w-full bg-slate-200 text-slate-500 text-[10px] font-bold uppercase text-center py-1">Уволен: {new Date(res.firedAt).toLocaleDateString()}</div>}
                          {res.isSettled && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter">Рассчитан</div>}
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

      {selectedResource && <EmployeeModal resource={selectedResource} onClose={() => setSelectedResource(null)} actions={actions} />}
      {shiftModal && <ShiftEditModal data={shiftModal} onClose={() => setShiftModal(null)} onSave={actions.updateResourceSchedule} />}
      {noteModal && (
          <ArchiveNoteModal 
              data={noteModal} 
              onClose={() => setNoteModal(null)} 
              onSave={(id, note) => {
                  actions.updateResourceNote(id, note);
                  setNoteModal(null);
              }} 
          />
      )}
    </div>
  );
}

function ArchiveNoteModal({ data, onClose, onSave }) {
    const [note, setNote] = useState(data.note || '');
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Комментарий к расчёту</h3>
                <p className="text-slate-400 text-sm mb-4 font-bold">{data.name}</p>
                <textarea 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    className="w-full h-32 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-medium text-slate-700 text-sm"
                    placeholder="Укажите точную сумму, причину увольнения или другие детали..."
                    autoFocus
                />
                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 font-black text-slate-400 hover:text-slate-600 transition uppercase text-[10px] tracking-widest">Отмена</button>
                    <button 
                        onClick={() => onSave(data.resourceId, note)} 
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-orange-600 transition-all uppercase text-[10px] tracking-widest"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmployeeModal({ resource, onClose, actions }) {
    const isNew = !resource.id;
    const POSITIONS = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез', 'Слесарь', 'Разнорабочий', 'Кладовщик', 'Маляр', 'Сварщик', 'Электрик', 'Лентопил'];
    const [formData, setFormData] = useState({
        name: resource.name || '',
        position: resource.position || '',
        phone: resource.phone || '',
        address: resource.address || '',
        dob: resource.dob || '',
        employmentDate: resource.employmentDate || new Date().toISOString().split('T')[0],
        probationEndDate: resource.probationEndDate || '',
        baseRate: resource.baseRate || '',
        hoursPerDay: resource.hoursPerDay || 8,
        workWeekends: resource.workWeekends || false,
        photoUrl: resource.photoUrl || '',
        salaryEnabled: resource.salaryEnabled !== undefined ? resource.salaryEnabled : true,
        isOfficiallyEmployed: resource.isOfficiallyEmployed !== undefined ? resource.isOfficiallyEmployed : false
    });

    const handleChange = (field, value) => {
        if (field === 'employmentDate' || field === 'position') {
            const empDate = field === 'employmentDate' ? value : formData.employmentDate;
            const pos = field === 'position' ? value : formData.position;
            if (empDate) {
                const probationEnd = new Date(empDate);
                const probationDays = pos === 'Плазморез' ? 30 : 7;
                probationEnd.setDate(probationEnd.getDate() + probationDays);
                setFormData(prev => ({ ...prev, [field]: value, probationEndDate: probationEnd.toISOString().split('T')[0] }));
                return;
            }
        }
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                    <h2 className="text-2xl font-bold">{isNew ? 'Новый сотрудник' : formData.name}</h2>
                    <button onClick={onClose} className="text-white hover:text-slate-300 transition"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">ФИО</label><input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none"/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Должность</label><select value={formData.position} onChange={e => handleChange('position', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none">{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Начало работы</label><input type="date" value={formData.employmentDate} onChange={e => handleChange('employmentDate', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none"/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Исп. срок</label><input type="date" value={formData.probationEndDate} onChange={e => handleChange('probationEndDate', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none"/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Ставка (₽)</label><input type="number" value={formData.baseRate} onChange={e => handleChange('baseRate', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none"/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Часов в день</label><input type="number" value={formData.hoursPerDay} onChange={e => handleChange('hoursPerDay', e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none"/></div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer"><input type="checkbox" checked={formData.salaryEnabled} onChange={e => handleChange('salaryEnabled', e.target.checked)} className="w-5 h-5 rounded text-orange-600"/> <span className="text-sm font-bold">Расчет зарплаты</span></label>
                        <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer"><input type="checkbox" checked={formData.isOfficiallyEmployed} onChange={e => handleChange('isOfficiallyEmployed', e.target.checked)} className="w-5 h-5 rounded text-emerald-600"/> <span className="text-sm font-bold">Официальное трудоустройство</span></label>
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500">Отмена</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Сохранить</button>
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
                <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-3 font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Отмена</button><button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-orange-600">Сохранить</button></div>
            </div>
        </div>
    );
}
