import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Shield, ShieldAlert, X, Save, AlertCircle, Users } from 'lucide-react';
import { KtuInput } from './SharedComponents';

export default function MasterEfficiencyView({ resources, actions }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showTable, setShowTable] = useState(false);

    // Состояние для модалки нарушения ТБ
    const [safetyModal, setSafetyModal] = useState(null); // { resId, dateStr, currentComment }

    // Состояние для редактирования КТУ прямо в таблице
    const [editingCell, setEditingCell] = useState(null); // { resId, dateStr }
    const [editValue, setEditValue] = useState('');

    const shiftDate = (days) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + days);
        setCurrentDate(d);
    };

    const dateStr = currentDate.toISOString().split('T')[0];
    const displayDate = currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // Исключаем определенные должности из КТУ
    const excludedPositions = ['Мастер', 'Технолог', 'Электрик', 'Стажёр', 'Плазморез'];
    const filteredResources = resources.filter(res => !excludedPositions.includes(res.position));

    // Подсчет статистики для напоминаний
    let notMarkedCount = 0;
    let noKtuCount = 0;

    filteredResources.forEach(res => {
        const override = res.scheduleOverrides?.[dateStr];
        const reason = res.scheduleReasons?.[dateStr];
        const dateObj = new Date(dateStr);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const isStandardWorkDay = res.workWeekends ? true : !isWeekend;

        // Проверяем присутствие
        let isPresent = false;
        if (override !== undefined) {
            isPresent = override > 0;
        } else if (isStandardWorkDay && reason !== 'sick' && reason !== 'absent') {
            isPresent = true;
        }

        if (!isPresent && isStandardWorkDay) {
            notMarkedCount++;
        }

        // Проверяем КТУ только у присутствующих (исключая стажеров)
        if (isPresent && res.position !== 'Стажёр') {
            const ktuValue = res.dailyEfficiency?.[dateStr];
            if (ktuValue === undefined || ktuValue === 0) {
                noKtuCount++;
            }
        }
    });

    const handleSafetyClick = (res) => {
        const violation = res.safetyViolations?.[dateStr];
        const isViolated = violation?.violated;

        if (!isViolated) {
            // Открываем модалку для ввода причины
            setSafetyModal({
                resId: res.id,
                dateStr: dateStr,
                name: res.name,
                comment: ''
            });
        } else {
            // Снимаем нарушение
            if(confirm("Снять нарушение ТБ?")) {
                actions.updateResourceSafety(res.id, dateStr, null);
            }
        }
    };

    const handleCellClick = (resId, dStr, currentValue) => {
        setEditingCell({ resId, dateStr: dStr });
        setEditValue(currentValue || '');
    };

    const handleCellSave = () => {
        if (editingCell) {
            const value = parseInt(editValue) || 0;
            actions.updateResourceEfficiency(editingCell.resId, editingCell.dateStr, value);
            setEditingCell(null);
            setEditValue('');
        }
    };

    const handleCellBlur = () => {
        handleCellSave();
    };

    const handleCellKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCellSave();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const handleMarkPresent = (res, dStr) => {
        // Отмечаем как присутствующего (стандартные часы)
        const standardHours = res.hoursPerDay || 8;
        actions.updateResourceSchedule(res.id, dStr, standardHours, null);
    };

    const handleMarkAbsent = (res, dStr) => {
        // Отмечаем как отсутствующего (0 часов + причина 'absent')
        actions.updateResourceSchedule(res.id, dStr, 0, 'absent');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
            
            {/* Навигация */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => shiftDate(-1)} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200"><ChevronLeft size={20}/></button>
                    <div className="text-center w-40">
                         <div className="text-lg font-bold text-gray-800 capitalize leading-tight">{displayDate}</div>
                         <div className="text-xs text-gray-400">{currentDate.getFullYear()}</div>
                    </div>
                    <button onClick={() => shiftDate(1)} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200"><ChevronRight size={20}/></button>
                </div>
                
                <button 
                    onClick={() => setShowTable(!showTable)}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
                >
                    {showTable ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    {showTable ? 'Скрыть таблицу' : 'Показать сводку'}
                </button>
            </div>

            {/* Сводная таблица */}
            {showTable && (
                <div className="bg-white rounded-xl shadow-lg border-4 border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="p-4 border-b-4 border-slate-800 bg-gradient-to-r from-slate-800 to-slate-700 text-sm font-black text-white uppercase tracking-wider flex items-center justify-between">
                        <span>КТУ за {currentDate.toLocaleDateString('ru-RU', { month: 'long' })}</span>
                        <span className="text-xs font-normal opacity-75">Нажмите на ячейку для редактирования</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-br from-indigo-600 to-indigo-500">
                                    <th className="p-3 text-left sticky left-0 bg-indigo-600 border-r-4 border-slate-800 border-b-4 min-w-[140px] text-white font-black uppercase tracking-wide shadow-lg z-20">Сотрудник</th>
                                    {monthDays.map(d => {
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        const isToday = d === currentDate.getDate();
                                        return (
                                            <th key={d} className={`p-2 border-r-2 border-b-4 min-w-[42px] font-bold transition-colors
                                                ${isToday ? 'bg-orange-500 text-white border-orange-600' : ''}
                                                ${!isToday && isWeekend ? 'bg-rose-100 text-rose-700 border-rose-300' : ''}
                                                ${!isToday && !isWeekend ? 'bg-indigo-500 text-white border-indigo-400' : ''}
                                            `}>
                                                <div className="text-base font-black">{d}</div>
                                                <div className="text-[9px] uppercase opacity-80">{date.toLocaleDateString('ru-RU', {weekday: 'short'})}</div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResources.map((res, idx) => (
                                    <tr key={res.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50`}>
                                        <td className={`p-3 text-left sticky left-0 border-r-4 border-b-2 border-slate-300 font-bold text-slate-800 shadow-md z-10 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                            <div className="truncate">{res.name}</div>
                                            <div className="text-[10px] text-slate-400 font-normal">{res.position}</div>
                                        </td>
                                        {monthDays.map(d => {
                                            const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                            const val = res.dailyEfficiency?.[dStr];
                                            const isEditing = editingCell?.resId === res.id && editingCell?.dateStr === dStr;
                                            const isToday = d === currentDate.getDate();
                                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                            return (
                                                <td
                                                    key={d}
                                                    className={`border-r-2 border-b-2 cursor-pointer transition-all relative group
                                                        ${isToday ? 'bg-orange-50 border-orange-200' : ''}
                                                        ${!isToday && isWeekend ? 'bg-rose-50/50 border-rose-200' : ''}
                                                        ${!isToday && !isWeekend ? 'border-slate-200' : ''}
                                                        ${isEditing ? 'ring-4 ring-blue-500 z-30' : 'hover:bg-blue-100 hover:ring-2 hover:ring-blue-300'}
                                                    `}
                                                    onClick={() => !isEditing && handleCellClick(res.id, dStr, val)}
                                                >
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellBlur}
                                                            onKeyDown={handleCellKeyDown}
                                                            autoFocus
                                                            className="w-full h-full text-center font-black text-blue-700 bg-blue-50 border-2 border-blue-500 outline-none p-1"
                                                        />
                                                    ) : (
                                                        <div className="py-2 px-1">
                                                            {val > 0 ? (
                                                                <span className={`font-black text-base
                                                                    ${val >= 100 ? 'text-emerald-600' : ''}
                                                                    ${val >= 80 && val < 100 ? 'text-blue-600' : ''}
                                                                    ${val < 80 && val > 0 ? 'text-orange-600' : ''}
                                                                `}>{val}</span>
                                                            ) : (
                                                                <span className="text-slate-300 text-lg">—</span>
                                                            )}
                                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-500/10 flex items-center justify-center transition-opacity">
                                                                <span className="text-[9px] font-bold text-blue-600 bg-white/90 px-1.5 py-0.5 rounded">Изменить</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Напоминания мастеру */}
            {notMarkedCount > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-4 shadow-lg animate-in slide-in-from-top-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center">
                        <AlertCircle size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-amber-900 text-base">Отметьте присутствие сотрудников</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            {notMarkedCount} {notMarkedCount === 1 ? 'сотрудник не отмечен' : 'сотрудников не отмечены'} — нажмите "Пришел" или "Не пришел" для каждого
                        </p>
                    </div>
                </div>
            )}

            {noKtuCount > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 flex items-center gap-4 shadow-lg animate-in slide-in-from-top-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-blue-900 text-base">Проставьте КТУ сотрудникам</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            {noKtuCount} {noKtuCount === 1 ? 'сотруднику требуется' : 'сотрудникам требуется'} оценка КТУ за сегодня
                        </p>
                    </div>
                </div>
            )}

            {/* Карточки ввода */}
            <div className="grid gap-3">
                {filteredResources.map(res => {
                    const currentEff = (res.dailyEfficiency && res.dailyEfficiency[dateStr]) || 0;
                    const violation = res.safetyViolations?.[dateStr];
                    const isSafetyViolated = violation?.violated;
                    // КТУ не начисляется стажёрам
                    const isKtuDisabled = res.position === 'Стажёр';

                    // Определяем состояние присутствия сотрудника
                    const override = res.scheduleOverrides?.[dateStr];
                    const reason = res.scheduleReasons?.[dateStr];
                    const standardHours = res.hoursPerDay || 8;

                    // Три состояния:
                    // 1. Не отмечен (ни override, ни reason)
                    // 2. Пришел (override > 0)
                    // 3. Не пришел (override === 0 или reason === 'absent')
                    const isMarkedPresent = override !== undefined && override > 0;
                    const isMarkedAbsent = override === 0 || reason === 'absent';
                    const isNotMarked = override === undefined && !reason;

                    return (
                        <div key={res.id} className={`bg-white p-4 rounded-xl border transition flex items-center justify-between
                             ${isSafetyViolated ? 'border-red-300 bg-red-50/30' : 'border-gray-200 shadow-sm'}
                        `}>
                            <div className="flex items-center gap-3">
                                {/* Две кнопки: Пришел / Не пришел */}
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => handleMarkPresent(res, dateStr)}
                                        className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isMarkedPresent
                                                ? 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                                        }`}
                                        title="Отметить присутствие"
                                    >
                                        ✓ Пришел
                                    </button>
                                    <button
                                        onClick={() => handleMarkAbsent(res, dateStr)}
                                        className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isMarkedAbsent
                                                ? 'bg-red-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                                        }`}
                                        title="Отметить отсутствие"
                                    >
                                        ✗ Не пришел
                                    </button>
                                </div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                                    ${isSafetyViolated ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}
                                `}>
                                    {isSafetyViolated ? <ShieldAlert size={20}/> : res.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 text-base">{res.name}</div>
                                    {isSafetyViolated 
                                        ? <div className="text-[10px] text-red-600 font-bold uppercase">{violation.comment || 'Нарушение ТБ'}</div>
                                        : <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{isKtuDisabled ? 'КТУ не предусмотрен' : 'Коэффициент участия'}</div>
                                    }
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={() => handleSafetyClick(res)}
                                    className={`flex flex-col items-center gap-1 transition ${isSafetyViolated ? 'text-red-600 opacity-100' : 'text-gray-300 hover:text-gray-400'}`}
                                    title="Нарушение техники безопасности"
                                >
                                    <Shield size={24} fill={isSafetyViolated ? "currentColor" : "none"} />
                                    <span className="text-[9px] font-bold uppercase">{isSafetyViolated ? 'Снять' : 'ТБ OK'}</span>
                                </button>

                                <div className={`flex items-center gap-2 ${isKtuDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <KtuInput 
                                        resId={res.id} 
                                        date={dateStr} 
                                        initialValue={currentEff} 
                                        onSave={actions.updateResourceEfficiency} 
                                    />
                                    <span className="text-gray-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* МОДАЛКА НАРУШЕНИЯ ТБ */}
            {safetyModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><ShieldAlert size={20}/> Нарушение ТБ</h3>
                            <button onClick={() => setSafetyModal(null)}><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-2 font-medium">Сотрудник: <span className="font-bold text-slate-800">{safetyModal.name}</span></p>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Причина / Комментарий</label>
                            <input 
                                type="text" 
                                autoFocus
                                value={safetyModal.comment}
                                onChange={(e) => setSafetyModal({...safetyModal, comment: e.target.value})}
                                className="w-full border-2 border-red-100 rounded-lg p-3 text-slate-800 focus:border-red-500 outline-none"
                                placeholder="Например: Без каски"
                            />
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setSafetyModal(null)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition">Отмена</button>
                                <button 
                                    onClick={() => {
                                        actions.updateResourceSafety(safetyModal.resId, safetyModal.dateStr, { violated: true, comment: safetyModal.comment });
                                        setSafetyModal(null);
                                    }} 
                                    className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-lg"
                                >
                                    Подтвердить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}